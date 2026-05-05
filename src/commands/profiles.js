import { writeFileSync, readFileSync, existsSync } from 'fs';
import { basename } from 'path';
import Table from 'cli-table3';
import ora from 'ora';
import { createApiClient } from '../lib/api.js';
import { loadCredentials } from '../lib/credentials.js';

function requireAuth() {
  if (!loadCredentials()?.access_token) {
    console.error('Not logged in. Run: insighta login');
    process.exit(1);
  }
}

function displayProfiles(profiles) {
  if (!profiles.length) { console.log('No profiles found.'); return; }
  const table = new Table({
    head: ['ID', 'Name', 'Gender', 'Age', 'Age Group', 'Country'],
    colWidths: [38, 22, 10, 6, 12, 18],
  });
  profiles.forEach(p => table.push([p.id, p.name, p.gender, p.age, p.age_group, p.country_name]));
  console.log(table.toString());
}

function displayPagination(data) {
  console.log(`\nPage ${data.page} of ${data.total_pages} — ${data.total} total results`);
}

export async function listProfilesCommand(opts) {
  requireAuth();
  const spinner = ora('Fetching profiles...').start();
  try {
    const api = createApiClient();
    const params = {};
    if (opts.gender) params.gender = opts.gender;
    if (opts.country) params.country_id = opts.country;
    if (opts.ageGroup) params.age_group = opts.ageGroup;
    if (opts.minAge) params.min_age = opts.minAge;
    if (opts.maxAge) params.max_age = opts.maxAge;
    if (opts.sortBy) params.sort_by = opts.sortBy;
    if (opts.order) params.order = opts.order;
    if (opts.page) params.page = opts.page;
    if (opts.limit) params.limit = opts.limit;

    const res = await api.get('/api/profiles', { params });
    spinner.stop();
    displayProfiles(res.data.data);
    displayPagination(res.data);
  } catch (err) {
    spinner.fail('Failed to fetch profiles');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function getProfileCommand(id) {
  requireAuth();
  const spinner = ora(`Fetching profile ${id}...`).start();
  try {
    const api = createApiClient();
    const res = await api.get(`/api/profiles/${id}`);
    const p = res.data.data;
    spinner.stop();
    const table = new Table();
    Object.entries(p).forEach(([k, v]) => table.push({ [k]: String(v ?? '') }));
    console.log(table.toString());
  } catch (err) {
    spinner.fail('Profile not found');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function searchProfilesCommand(query, opts) {
  requireAuth();
  const spinner = ora('Searching profiles...').start();
  try {
    const api = createApiClient();
    const params = { q: query };
    if (opts.page) params.page = opts.page;
    if (opts.limit) params.limit = opts.limit;

    const res = await api.get('/api/profiles/search', { params });
    spinner.stop();
    displayProfiles(res.data.data);
    displayPagination(res.data);
  } catch (err) {
    spinner.fail('Search failed');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function createProfileCommand(opts) {
  requireAuth();
  const spinner = ora(`Creating profile for "${opts.name}"...`).start();
  try {
    const api = createApiClient();
    const res = await api.post('/api/profiles', { name: opts.name });
    const p = res.data.data;
    spinner.succeed(res.data.message || 'Profile created');
    const table = new Table();
    Object.entries(p).forEach(([k, v]) => table.push({ [k]: String(v ?? '') }));
    console.log(table.toString());
  } catch (err) {
    spinner.fail('Failed to create profile');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function ingestProfilesCommand(filePath) {
  requireAuth();
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const spinner = ora(`Ingesting ${filePath}...`).start();
  try {
    const api = createApiClient();
    const fileContent = readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, basename(filePath));

    const res = await api.post('/api/profiles/ingest', formData);
    spinner.succeed('Ingestion complete');

    const { total_rows, inserted, skipped, reasons } = res.data;
    const table = new Table();
    table.push(
      { 'Total Rows': total_rows },
      { 'Inserted': inserted },
      { 'Skipped': skipped },
    );
    console.log(table.toString());

    const reasonsTable = new Table({ head: ['Skip Reason', 'Count'] });
    Object.entries(reasons).forEach(([k, v]) => reasonsTable.push([k, v]));
    console.log(reasonsTable.toString());
  } catch (err) {
    spinner.fail('Ingestion failed');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function exportProfilesCommand(opts) {
  requireAuth();
  if (opts.format !== 'csv') {
    console.error('Only --format csv is supported');
    process.exit(1);
  }
  const spinner = ora('Exporting profiles...').start();
  try {
    const api = createApiClient();
    const params = { format: 'csv' };
    if (opts.gender) params.gender = opts.gender;
    if (opts.country) params.country_id = opts.country;
    if (opts.ageGroup) params.age_group = opts.ageGroup;

    const res = await api.get('/api/profiles/export', { params, responseType: 'text' });
    const filename = `profiles_${Date.now()}.csv`;
    writeFileSync(filename, res.data);
    spinner.succeed(`Exported to ${filename}`);
  } catch (err) {
    spinner.fail('Export failed');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}
