# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
This software is a NextJS service which provides some pages to customers and business owners. The purpose is providing some features to different companies as our customer to provide some information of their software and we try to find security issues in their softwares. Each company can have some different environments for their services like dev, test, prod, etc. This means they can make different stages, then for each stage they can register different services they have, for each service they can implement API endpoints and expected entry data and also result. Then, we can run our E2E security tests to make sure all the API endpoints are safe. Another feature is that we get a list of packages they use and from our database we can see if those packages are risky and have any security issue so then we can let them know in different ways.

## Architecture

NextJS application. All feature code is in `src/modules/`; cross-cutting utilities are in `src/shared/`.
The context directory stands for all backend parts that will be invoked from the /api context in the NextJS.
The module directory stands for all the different modules that should be implemented on the front side. For each entity that we have a different Route in the app folder like admin, we have the same folder in the module where we implement front React components. In each module we have: 
1: /app/folder-name/page.tsx: This file just controls the page structure(the design and elements) and calls the respective module page(/modules/root-module-name/pages/SubModulePage/SubModulePage.tsx)
2: /modules/root-module-name/pages/SubModulePage/SubModulePage.tsx is the parent component that controls states and global things in that specific Route like session, translation, states, callbacks, hooks, etc...
3: Each module contains a folder structure like below:
- components: contains all the custom components related to that specific module or sub-modules.
- constants: contains all the constants or variables related to that specific module or sub-modules that can be exported and used couple of places.
- types: keeps all TypeScrypt types in that module or sub-modules.
- hooks: keeps all React custom Hooks in that module or sub-modules.
- services: keeps all functions to fetch data in that module or sub-modules.
- schemas: keeps all zod types and schemas and data transfer object created by zod.
- helpers: contains all the functions that will be required in that module for data mapping, filtration, validation, etc...
- ssr where we put all the codes related to the SSR feature in the NextJS.
4: The SubModulePage, acts as a React parent component in the module, its sub-components should be made in the @/modules/module-name/components/sub-module-name/sub-component.

With modules we are talking about front part of the codes and with contexts we are talking about the codes that will be executed on the server side(/api route) in a NextJS application.

SSR codes should be placed in the module folder code side in a SSR folder.

Shared folder in the root folder keeps everything that can be shared in the contexts and modules.
/shared/components are the components that can be shared in all modules.
Other shared folders means anything that can shared just in root directory so /context/shared means anything that can be shared between different contexts.

We use MUI as our UI library and all basic components should be places in the root components directory like button, form, card, TextBox, etc...

## Data fetching or Sending an API request
To fetch data, we use a custom hook in each module, this custom hook send a request to the dedicated API endpoint via Axios. Hooks are keep in the hook folder of each module and the function that fetches the data is placed in the services. We use React Tanstack query to keep control against caching and dat fetching. 

## unit tests
We use React testing library with Jest to right a 100% isolated unit tests next to each .tsx file. For each React component, we need to make an isolated area where we mock all outer modules, hooks, custom components and everything that is imported into that component. These unit tests should have ComponentName.spec.tsx and should be placed next to the component itself.

For the hooks, services, functions, Zod schemas and everything else we follow the same work flow to write unit tests with Jest for those parts of the codes.

We run all the unit tests before committing something and if a unit test gets failed we are not free to commit.

## E2E tests
We use playRight to right E2E tests. E2E tests will run on the pipeline level and if one them gets failed, the pipeline should be rejected. So, we are not free to merge until resolving the issue in the E2E tests.

E2E tests should be placed in a root test folder in the src folder. For the E2E tests, We must everything that is going to be fetched from the out side of the page, like API requests, sessions, etc.

- In the app folder, different parts have different routes each stands:
1: Admin route is about software administration stuffs whose role is `SUPER_ADMIN` or `ADMIN`.
2: Company contains all routes related to the each company.
3: auth, should contain register, login, forgot password and anything that is related to authentication and before user login.

This list will be extended when we add new features like tests, runner, etc.

### Roles

Defined in `packages/database/prisma/schema.prisma` as the `UserRole` enum:  
`SUPER_ADMIN`, `ADMIN`, `BUSINESS_OWNER`, `BUSINESS_ADMIN`, `BUSINESS_MEMBER`.

Platform roles (`SUPER_ADMIN`, `ADMIN`) manage the whole platform. Business roles are scoped to a single company.
e
### Path aliases 
"@/*": ["./src/*"],
"@/api/*": ["./src/app/api/*"],
"@/tests/*": ["./src/__tests__*"],
"@/components/*": ["./src/components/*"],
"@/modules/*": ["./src/modules/*"],
"@/contexts/*": ["./src/contexts/*"],
"@/shared/*": ["./src/shared/*"],

### API Response shape
All endpoints return via `createResponse()` from `src/shared/utils/createResponse.ts`:  
`{ success: boolean, error: string | null, data: T }`. If the structure was differ, it should be logged with an error log.

### JWT

Access token: 60 min (`ACCESS_TOKEN_SECRET`). Refresh token: 30 days (`REFRESH_TOKEN_SECRET`). Fallback secrets are hardcoded in `src/shared/constants/jwtConstants.ts` — always override with real env vars.

## Commands

```bash
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint-lint": "next lint",
"lint": "eslint . --ext .ts,.tsx,.js,.jsx",
"lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
"unit-test": "jest",
"e2e-test": "pnpm exec playwright test --ui",
"e2e-report": "pnpm exec playwright show-report"
```


## Implementation and code changes flow
1: We implement a module if needed otherwise make changes in the dedicated module.
2: Describing the endpoints in the CLI window and how it can be tested via Postman and after getting approval, we should go to the next step which is writing unit tests.
2: One the expected functionality is done and approved, we must implement all required unit tests. For each file in the module, we must make a 100% isolated unit test and mock everything from external and/or other modules.
3: Need to get approval again when unit tests are done. After getting approval for the unit tests, E2E tests should be implemented.
3: We must make E2E tests for the changes at the end in the test folder.
4: Each time that we need to touch a part of the code from before, specially if we need to change E2E tests or Unit tests, it should be marked in the console and after getting confirmation the changes should be placed otherwise we have to make the right changes that will be described in the CLI.
5: If any of these steps gets failed, we need to repeat just that step otherwise there is some changes in the step 1 or 2 so we need jump to those steps and continue from there.

## Code execution and deployment
We must have a separated docker file and configuration here based on the .env file to be able run this service independently without considering other services.

## Documentation
We make clear and helpful documentation on the ReadMe file about all the changes have done. Every time that a new logic is going to change something we had from before, It mast be marked in the CLI and after getting final approval it can be considered as the new logic so means all documents and Claude files should be updated accordingly.

## Help & Support page (must stay in sync with the UI)
The customer-facing Help & Support page lives at `/company/[id]/help` (sidebar item "Help & Support"). Its module is `src/modules/help/`:
- `constants/helpArticles.ts` is the single source of truth. Every article has a question-style `title`, a `description`, search `keywords`, a `category`, content `blocks` (paragraph / steps / list / note) and an optional `link`. Articles with `popular: true` appear under "Popular questions".
- `helpers/searchHelpArticles.ts` does the search (all typed words must match the title, description or keywords).

**Rule: whenever you add or change a page, route, sidebar item, button, form field, dialog, role permission, plan limit or automation behaviour (scan triggers, GitHub cadence, notification rules), update `helpArticles.ts` in the same change.**
- New feature: add at least one article (and a new `HelpCategory` plus label/order entries if needed).
- Changed or removed UI/behaviour: edit or delete the affected article(s) so labels, button names, fields and rules match what the user actually sees.
- Describe only what exists. Features that aren't built yet (e.g. automated E2E test runs) must be marked as planned/not available, and the article rewritten when they ship.
- Mention the Help change in the console summary when you present a feature for approval, and cover new article content/search in the unit tests.
