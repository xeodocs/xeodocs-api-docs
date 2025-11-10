// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'XeoDocs Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/xeodocs' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'What is XeoDocs?', slug: 'getting-started/what-is-xeodocs' },
						{ label: 'Installation Guide', slug: 'getting-started/installation' },
						{ label: 'General Design', slug: 'getting-started/design' },
						{ label: 'Event Flows', slug: 'getting-started/event-flows' },
					],
				},
				{
					label: 'Microservices',
					items: [
						{ label: 'Gateway', slug: 'microservices/gateway' },
						{ label: 'Auth', slug: 'microservices/auth' },
						{ label: 'Project', slug: 'microservices/project' },
						{ label: 'Repository', slug: 'microservices/repository' },
						{ label: 'Translation', slug: 'microservices/translation' },
						{ label: 'Build', slug: 'microservices/build' },
						{ label: 'Logging', slug: 'microservices/logging' },
						{ label: 'Scheduler', slug: 'microservices/scheduler' },
						{ label: 'Worker', slug: 'microservices/worker' },
						{ label: 'Analytics Processor', slug: 'microservices/analytics-processor' },
						{ label: 'Analytics', slug: 'microservices/analytics' },
					],
				},
			],
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
			},
			defaultLocale: 'root',
		}),
	],
});
