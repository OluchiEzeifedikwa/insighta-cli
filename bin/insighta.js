#!/usr/bin/env node
import { program } from 'commander';
import { loginCommand, logoutCommand, whoamiCommand } from '../src/commands/auth.js';
import {
  listProfilesCommand,
  getProfileCommand,
  searchProfilesCommand,
  createProfileCommand,
  exportProfilesCommand,
} from '../src/commands/profiles.js';

program
  .name('insighta')
  .description('Insighta Labs CLI')
  .version('1.0.0');

program.command('login').description('Login with GitHub').action(loginCommand);
program.command('logout').description('Logout').action(logoutCommand);
program.command('whoami').description('Show current user').action(whoamiCommand);

const profiles = program.command('profiles').description('Manage profiles');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('--gender <gender>', 'Filter by gender')
  .option('--country <country_id>', 'Filter by country code')
  .option('--age-group <age_group>', 'Filter by age group')
  .option('--min-age <min_age>', 'Minimum age')
  .option('--max-age <max_age>', 'Maximum age')
  .option('--sort-by <sort_by>', 'Sort field: age, created_at, gender_probability')
  .option('--order <order>', 'Sort order: asc or desc')
  .option('--page <page>', 'Page number')
  .option('--limit <limit>', 'Results per page (max 50)')
  .action(listProfilesCommand);

profiles
  .command('get <id>')
  .description('Get a profile by ID')
  .action(getProfileCommand);

profiles
  .command('search <query>')
  .description('Search profiles using natural language')
  .option('--page <page>', 'Page number')
  .option('--limit <limit>', 'Results per page')
  .action(searchProfilesCommand);

profiles
  .command('create')
  .description('Create a new profile')
  .requiredOption('--name <name>', 'Profile name')
  .action(createProfileCommand);

profiles
  .command('export')
  .description('Export profiles to CSV')
  .requiredOption('--format <format>', 'Export format (csv)')
  .option('--gender <gender>', 'Filter by gender')
  .option('--country <country_id>', 'Filter by country code')
  .option('--age-group <age_group>', 'Filter by age group')
  .action(exportProfilesCommand);

program.parse();
