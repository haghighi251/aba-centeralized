import type { HelpArticle, HelpCategory } from "@/modules/help/types/types";

/**
 * Single source of truth for the Help & Support page.
 *
 * KEEP THIS FILE IN SYNC WITH THE UI: whenever a page, button, form field,
 * dialog or automation rule changes (or a feature is added), add or update the
 * matching article here in the same change. See "Help & Support page" in
 * aba-web/CLAUDE.md.
 */

export const HELP_CATEGORY_LABEL: Record<HelpCategory, string> = {
  GETTING_STARTED: "Getting started",
  BUSINESS: "Business details",
  TEAMS: "Teams",
  ENVIRONMENTS: "Environments",
  SERVICES: "Services",
  PACKAGES: "Packages",
  TESTS: "E2E security tests",
  SECURITY: "Security & notifications",
  USERS: "Users",
  GITHUB_AUTOMATION: "GitHub, Bitbucket & automation",
  PLANS: "Plans & limits",
};

export const HELP_CATEGORY_ORDER: HelpCategory[] = [
  "GETTING_STARTED",
  "BUSINESS",
  "TEAMS",
  "ENVIRONMENTS",
  "SERVICES",
  "PACKAGES",
  "TESTS",
  "SECURITY",
  "USERS",
  "GITHUB_AUTOMATION",
  "PLANS",
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting started ───────────────────────────────────────────────────────
  {
    id: "getting-started",
    category: "GETTING_STARTED",
    title: "How do I get started?",
    description: "The recommended order for setting up your company, from first login to your first security report.",
    keywords: ["setup", "begin", "first steps", "onboarding", "tutorial", "start"],
    popular: true,
    blocks: [
      {
        type: "paragraph",
        text: "Our platform watches the software packages your services depend on and tells you when one of them has a known vulnerability. Set things up in this order:",
      },
      {
        type: "steps",
        items: [
          "Open Business Details and check your company information is correct.",
          "Open Teams and create at least one team (for example \"Platform\" or \"Backend\"). An environment can't exist without a team.",
          "Open Environments and add the stages you run, such as Development, Testing and Production.",
          "Open an environment and add each of its services (your API, BFF, worker and so on) with the Add Service button.",
          "Open a service's packages (the box icon) and add packages one by one, or upload your package.json.",
          "Click Security on the Packages page to see any vulnerabilities that were found.",
          "Optional: click Repository to connect GitHub or Bitbucket so a push re-scans your packages automatically.",
        ],
      },
      {
        type: "note",
        text: "Owners and Admins can create and change things. Members can view everything but can't make changes.",
      },
    ],
  },
  {
    id: "dashboard",
    category: "GETTING_STARTED",
    title: "What does the dashboard show?",
    description: "A guide to the cards, plan usage bars and quick-action buttons on your company dashboard.",
    keywords: ["home", "overview", "cards", "usage", "statistics", "stats", "quick actions"],
    link: { label: "Open dashboard", path: "" },
    blocks: [
      {
        type: "list",
        items: [
          "Company: your company username, email and account status.",
          "Team Members: how many users are registered in your company.",
          "Teams and Environments: how many of each you have.",
          "Current Plan: your subscription plan, its price, and whether Pay-as-you-go is enabled. The View Plans button opens Pricing & Plans.",
          "Usage bars: how much of your plan's limits you've used for Services and Environments, plus Monitored Branches when your plan limits them. Hover a bar to see the percentage.",
        ],
      },
      {
        type: "paragraph",
        text: "The buttons at the bottom are shortcuts: Edit Business Details, Manage Teams, Manage Environments and (for Owners and Admins) Manage Users.",
      },
      {
        type: "paragraph",
        text: "The left sidebar always lets you jump between Dashboard, Business Details, Teams, Environments, Users, Help & Support and Pricing & Plans, and Logout signs you out.",
      },
    ],
  },
  {
    id: "roles",
    category: "GETTING_STARTED",
    title: "What can each user role do?",
    description: "The difference between Owner, Admin and Member, and why some buttons are hidden or disabled.",
    keywords: ["permissions", "owner", "admin", "member", "access", "view only", "hidden button", "can't edit"],
    popular: true,
    blocks: [
      {
        type: "list",
        items: [
          "Owner: everything. Can manage business details, teams, environments, services, packages, repository connections and all users (including Admins).",
          "Admin: can manage business details, teams, environments, services, packages and repository connections. Can add and edit Members, but can't change Owners or other Admins.",
          "Member: read-only. Can view teams, environments, services, packages and vulnerabilities, but Add, Edit, Delete and Save buttons are hidden, and the Users menu isn't shown.",
        ],
      },
      {
        type: "note",
        text: "If you see a \"View only\" label on Business Details, or can't find an Add button, your role is Member. Ask an Owner or Admin to make the change or to update your role.",
      },
    ],
  },

  // ── Business details ──────────────────────────────────────────────────────
  {
    id: "business-edit",
    category: "BUSINESS",
    title: "How do I edit my business details?",
    description: "Update your company's email, website and address on the Business Details page.",
    keywords: ["company", "profile", "email", "website", "address", "city", "state", "province", "postal code", "country", "save changes"],
    popular: true,
    link: { label: "Open Business Details", path: "/details" },
    blocks: [
      {
        type: "steps",
        items: [
          "Click Business Details in the left sidebar.",
          "Change any of these fields: Email, Website, Address, City, State / Province, Postal Code, Country.",
          "Click Save Changes. A green \"Changes saved successfully\" message confirms it. If you see a red message, check your connection and try again.",
        ],
      },
      {
        type: "paragraph",
        text: "The chip next to the page title shows your company status (for example ACTIVE).",
      },
      {
        type: "note",
        text: "Only Owners and Admins can save changes. Everyone else sees a \"View only\" chip and disabled fields.",
      },
    ],
  },
  {
    id: "business-username",
    category: "BUSINESS",
    title: "Why can't I change the company username?",
    description: "The Company Username field is read-only on purpose.",
    keywords: ["username", "read-only", "rename company", "company name", "locked"],
    blocks: [
      {
        type: "paragraph",
        text: "The company username is used to identify your company everywhere in the platform, so changing it could break existing references. The field is always read-only. To change it, contact a platform administrator.",
      },
    ],
  },

  // ── Teams ─────────────────────────────────────────────────────────────────
  {
    id: "teams-what",
    category: "TEAMS",
    title: "What is a team?",
    description: "How teams group your environments and decide who receives security emails.",
    keywords: ["group", "squad", "department", "meaning", "explain", "what does team mean"],
    popular: true,
    link: { label: "Open Teams", path: "/teams" },
    blocks: [
      {
        type: "paragraph",
        text: "A team is a group inside your company that owns a set of environments, for example \"Payments\" or \"Mobile\". Think of it as the part of your organization responsible for a product.",
      },
      {
        type: "list",
        items: [
          "Every environment belongs to exactly one team, so you must create a team before you can add an environment.",
          "Users can be assigned to teams on the Users page.",
          "Vulnerability emails for a service go to your company's primary owner and to every active Admin who is linked to the team that owns the service's environment.",
          "Each team can have only one Production environment.",
        ],
      },
    ],
  },
  {
    id: "teams-create",
    category: "TEAMS",
    title: "How do I create a team?",
    description: "Add a team with the Add Team button.",
    keywords: ["add team", "new team", "name", "description"],
    link: { label: "Open Teams", path: "/teams" },
    blocks: [
      {
        type: "steps",
        items: [
          "Click Teams in the left sidebar.",
          "Click Add Team (top right).",
          "Enter a Name (required). Optionally add a Description.",
          "Click Add Team in the dialog. The team appears in the table with a generated Slug and the status ACTIVE.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins see the Add Team button.",
      },
    ],
  },
  {
    id: "teams-edit-delete",
    category: "TEAMS",
    title: "How do I edit, archive or delete a team?",
    description: "Use the pencil and trash icons in the Teams table.",
    keywords: ["rename team", "archived", "remove team", "delete team", "status", "active", "pencil", "trash"],
    link: { label: "Open Teams", path: "/teams" },
    blocks: [
      {
        type: "list",
        items: [
          "Pencil icon: opens Edit Team, where you can change the Name, Description and Status (ACTIVE or ARCHIVED). Click Save Changes to apply.",
          "Trash icon: asks for confirmation and then deletes the team.",
        ],
      },
      {
        type: "note",
        text: "Deleting a team also deletes all of its environments. If you only want to stop using a team, set its Status to ARCHIVED instead.",
      },
    ],
  },
  {
    id: "teams-find",
    category: "TEAMS",
    title: "How do I search or filter teams?",
    description: "Use the Search box and the Status filter above the Teams table.",
    keywords: ["filter", "find", "search teams", "status filter", "slug"],
    blocks: [
      {
        type: "paragraph",
        text: "Type in the Search box to filter teams as you type, and use the Status dropdown to show All, ACTIVE or ARCHIVED teams. The table shows each team's Name, Slug, Description and Status.",
      },
    ],
  },

  // ── Environments ──────────────────────────────────────────────────────────
  {
    id: "env-what",
    category: "ENVIRONMENTS",
    title: "What is an environment?",
    description: "Environments are the stages your software runs in, such as development, testing and production.",
    keywords: ["stage", "dev", "test", "staging", "prod", "pipeline", "meaning", "explain", "what does environment mean"],
    popular: true,
    link: { label: "Open Environments", path: "/environments" },
    blocks: [
      {
        type: "paragraph",
        text: "An environment is one stage of your delivery pipeline, for example Development, Testing, Staging or Production. Each environment belongs to a team and contains the services that run in that stage.",
      },
      {
        type: "paragraph",
        text: "Available types are Development, Testing, Staging, Production, Preview, Disaster Recovery, Demo, Support, Experimental and Custom. The type is a label and a colour; it helps you recognise the stage at a glance.",
      },
      {
        type: "note",
        text: "Click an environment row (or the eye icon) to open it and manage its services.",
      },
    ],
  },
  {
    id: "env-create",
    category: "ENVIRONMENTS",
    title: "How do I create an environment?",
    description: "Fill in the Add Environment form: team, name, type, order, production flag and description.",
    keywords: ["add environment", "new environment", "team", "order", "type", "description", "form fields"],
    link: { label: "Open Environments", path: "/environments" },
    blocks: [
      {
        type: "steps",
        items: [
          "Click Environments in the left sidebar, then Add Environment.",
          "Team (required): the team that owns this environment. If the list is empty, create a team first.",
          "Name (required): for example \"Staging EU\".",
          "Type: pick the stage that fits. Defaults to Custom.",
          "Order: the position in your pipeline (1 = Dev, 2 = Test, 3 = Staging, 4 = Prod). Leave blank and it's assigned automatically.",
          "Production environment switch: turn on for your live environment (see the next article).",
          "Description: optional notes.",
          "Click Add Environment.",
        ],
      },
    ],
  },
  {
    id: "env-production",
    category: "ENVIRONMENTS",
    title: "What does the Production switch do?",
    description: "The production flag marks your live environment and changes the default GitHub scan behaviour.",
    keywords: ["production flag", "safety flag", "live", "prod", "isProduction", "one production environment", "conflict"],
    blocks: [
      {
        type: "list",
        items: [
          "It marks the environment as your live one and shows a red Production chip in the table.",
          "A team can have at most one Production environment. Turning it on for a second one is rejected, so turn it off on the first one before moving the flag.",
          "It affects GitHub automation: a repository connected to a service in a Production environment defaults to scanning on every push (Instant) on any paid plan. See \"Which scan schedule should I use for development, test and production?\".",
        ],
      },
    ],
  },
  {
    id: "env-edit-delete",
    category: "ENVIRONMENTS",
    title: "How do I edit or delete an environment?",
    description: "Use the eye, pencil and trash icons in the Environments table.",
    keywords: ["rename environment", "status", "archive", "remove environment", "view", "actions column"],
    link: { label: "Open Environments", path: "/environments" },
    blocks: [
      {
        type: "list",
        items: [
          "Eye icon: opens the environment and lists its services.",
          "Pencil icon: opens Edit Environment. Same fields as when creating, plus a Status dropdown. Click Save Changes.",
          "Trash icon: asks for confirmation, then deletes the environment.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins see the pencil and trash icons. Everyone can use the eye icon.",
      },
    ],
  },
  {
    id: "env-find",
    category: "ENVIRONMENTS",
    title: "How do I search or filter environments?",
    description: "Combine Search with the Team, Type and Status filters.",
    keywords: ["filter", "find", "search environments", "by team", "by type"],
    blocks: [
      {
        type: "paragraph",
        text: "Above the Environments table you can type in Search and narrow the list with the Team, Type and Status dropdowns. The table columns are Order, Name, Slug, Team, Type, Production and Status.",
      },
    ],
  },
  {
    id: "plan-limit",
    category: "ENVIRONMENTS",
    title: "Why do I see \"Plan Limit Reached\"?",
    description: "Your subscription plan limits how many environments, services and monitored branches you can have.",
    keywords: ["limit", "maximum", "upgrade", "can't add", "quota", "view plans", "pay as you go"],
    blocks: [
      {
        type: "paragraph",
        text: "Each plan allows a maximum number of environments, services and monitored branches (connected repositories). When you reach a limit, the Add dialog shows a yellow \"Plan Limit Reached\" message with a View Plans button.",
      },
      {
        type: "list",
        items: [
          "Check your usage bars on the dashboard.",
          "Click View Plans (or Pricing & Plans in the sidebar) to compare plans and upgrade.",
          "Companies with Pay-as-you-go enabled aren't blocked by these limits.",
        ],
      },
    ],
    link: { label: "Open dashboard", path: "" },
  },

  // ── Services ──────────────────────────────────────────────────────────────
  {
    id: "service-what",
    category: "SERVICES",
    title: "What is a service?",
    description: "A service is one deployable piece of your software, like an API, a worker or a front end.",
    keywords: ["microservice", "api", "bff", "gateway", "app", "component", "meaning"],
    blocks: [
      {
        type: "paragraph",
        text: "A service is a single application or component that runs inside an environment, for example your BFF, API Gateway, a Worker or a Frontend. Each service has its own list of packages (the libraries it depends on), its own security findings and, optionally, its own GitHub repository connection.",
      },
      {
        type: "paragraph",
        text: "To see an environment's services, open Environments and click the environment.",
      },
    ],
  },
  {
    id: "service-create",
    category: "SERVICES",
    title: "How do I add a service?",
    description: "Use Add Service inside an environment and fill in name, type, base URL and optional rate limits.",
    keywords: ["new service", "base url", "rate limit", "window", "max requests", "type", "api gateway", "worker"],
    blocks: [
      {
        type: "steps",
        items: [
          "Open Environments and click the environment the service runs in.",
          "Click Add Service.",
          "Name (required).",
          "Type: BFF, API Gateway, Microservice, Worker, Frontend, Database, Cache, Message Queue or Other.",
          "Base URL (required): the address of the service, for example https://api.example.com.",
          "Rate Limit Window (ms) and Rate Limit Max Requests: optional. They cap how many requests per time window may be sent to this service.",
          "Description: optional.",
          "Click Add Service.",
        ],
      },
      {
        type: "note",
        text: "Editing a service also shows a Status dropdown. If you hit your plan's service limit you'll see \"Plan Limit Reached\".",
      },
    ],
  },
  {
    id: "service-actions",
    category: "SERVICES",
    title: "What do the icons in the services table do?",
    description: "Packages, view, edit and delete buttons for each service.",
    keywords: ["actions", "icons", "box icon", "view packages", "eye", "pencil", "trash", "back button"],
    blocks: [
      {
        type: "list",
        items: [
          "Box icon (View packages): opens the service's packages page.",
          "Eye icon, or clicking the row: shows the service details (slug, type, base URL, rate limit, status, description).",
          "Pencil icon: edit the service (Owners and Admins only).",
          "Trash icon: delete the service after confirmation (Owners and Admins only).",
          "Back arrow at the top: returns to the environments list.",
        ],
      },
      {
        type: "paragraph",
        text: "The Search, Type and Status filters above the table narrow the list.",
      },
    ],
  },

  // ── Packages ──────────────────────────────────────────────────────────────
  {
    id: "pkg-add",
    category: "PACKAGES",
    title: "How do I add a package to a service?",
    description: "Register a dependency manually with name, version, optional range and ecosystem.",
    keywords: ["add package", "dependency", "library", "npm", "pypi", "maven", "rubygems", "nuget", "go", "version range"],
    blocks: [
      {
        type: "steps",
        items: [
          "Open the service's packages page (the box icon in the services table).",
          "Click Add Package.",
          "Package Name, for example express.",
          "Version: the exact version you use, for example 4.18.2.",
          "Version Range (optional): your declared range, for example ^4.18.0.",
          "Ecosystem: NPM, PYPI, MAVEN, RUBYGEMS, NUGET, GO or OTHER.",
          "Save. The package is checked against known vulnerabilities right away.",
        ],
      },
    ],
  },
  {
    id: "pkg-upload",
    category: "PACKAGES",
    title: "How do I upload a package.json?",
    description: "Import many packages at once instead of adding them one by one.",
    keywords: ["bulk import", "upload", "file", "package.json", "import dependencies", "choose file"],
    popular: true,
    blocks: [
      {
        type: "steps",
        items: [
          "On the service's packages page, click Upload package.json.",
          "Choose the Ecosystem.",
          "Click the file button and pick your package.json. The packages found in the file are listed as a preview.",
          "Click Import (the button shows how many packages will be imported).",
        ],
      },
      {
        type: "paragraph",
        text: "Every imported package is checked against known vulnerabilities straight away. Only the newly added or changed packages are checked at that moment; the whole set is re-checked later by the automatic rescans.",
      },
    ],
  },
  {
    id: "pkg-edit-delete",
    category: "PACKAGES",
    title: "How do I edit or remove a package?",
    description: "Update a version after upgrading a dependency, or remove one you no longer use.",
    keywords: ["update package", "change version", "delete package", "remove package", "upgrade", "pencil", "trash"],
    blocks: [
      {
        type: "list",
        items: [
          "Pencil icon: opens Edit Package. Change the version after you upgrade it in your code. Changing the version marks the previous version as stale, and it stays visible in Package History.",
          "Trash icon: removes the package from this service after confirmation. Removed packages are listed in Package History.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins see these icons.",
      },
    ],
  },
  {
    id: "pkg-history",
    category: "PACKAGES",
    title: "What is Package History?",
    description: "Look back at packages that are stale or were removed from a service.",
    keywords: ["history", "removed", "stale", "old packages", "view history", "audit"],
    blocks: [
      {
        type: "paragraph",
        text: "Click View History on the Packages page to open a list of packages that are no longer active. Use Search to find a package by name, and the Status filter to show All, Stale or Removed entries. Click Close when you're done.",
      },
    ],
  },
  {
    id: "pkg-find",
    category: "PACKAGES",
    title: "How do I read and filter the packages table?",
    description: "Search by name, filter by ecosystem and understand the alarm count.",
    keywords: ["alarm count", "columns", "search packages", "ecosystem filter", "introduced"],
    blocks: [
      {
        type: "paragraph",
        text: "Use Search and the Ecosystem dropdown above the table. The table lists each package with its ecosystem, version, version range, when it was introduced and its Alarm count: how many times a vulnerability has been found for it.",
      },
      {
        type: "paragraph",
        text: "The top of the page also has Security (vulnerabilities), Repository (GitHub or Bitbucket), View History, Upload package.json and Add Package buttons. A back arrow returns to the services list.",
      },
    ],
  },

  // ── Security & notifications ──────────────────────────────────────────────
  {
    id: "vuln-view",
    category: "SECURITY",
    title: "How do I see the vulnerabilities in my service?",
    description: "Open the Security page from a service's packages page and filter by severity.",
    keywords: ["cve", "security", "report", "findings", "critical", "high", "severity", "scan results"],
    popular: true,
    blocks: [
      {
        type: "steps",
        items: [
          "Open the service's packages page.",
          "Click Security.",
          "Check the red CRITICAL and HIGH counters at the top.",
          "Use Search (CVE, package or summary text) and the Severity dropdown to narrow the list.",
          "Click the view icon on a row to see full details.",
        ],
      },
    ],
  },
  {
    id: "vuln-detail",
    category: "SECURITY",
    title: "What does a vulnerability's detail window tell me?",
    description: "Severity, affected versions and the version that fixes the problem.",
    keywords: ["fix version", "affected range", "published", "how to fix", "upgrade to", "recommended"],
    blocks: [
      {
        type: "list",
        items: [
          "Severity badge: how serious the issue is.",
          "Package and Ecosystem: what is affected.",
          "Affected range: which versions have the problem.",
          "Fix version: the version to upgrade to.",
          "Published: when the vulnerability became public.",
        ],
      },
      {
        type: "paragraph",
        text: "After you upgrade the package in your code, edit it on the Packages page and enter the new version so the platform tracks the version you actually run.",
      },
    ],
  },
  {
    id: "notif-how",
    category: "SECURITY",
    title: "How do vulnerability emails work?",
    description: "Who gets notified, how often, and why you receive one combined email per service.",
    keywords: ["email", "digest", "alert", "notification", "recipients", "daily", "reminder", "spam"],
    link: { label: "Open Teams", path: "/teams" },
    blocks: [
      {
        type: "list",
        items: [
          "When a scan finds a vulnerable package, it is queued for notification. Detection and email are separate steps.",
          "A daily check (08:00 by default) collects every package that is due, confirms it is still vulnerable, and sends one combined digest email per recipient per service, never one email per package.",
          "The same package is not re-announced more often than once every 24 hours by default.",
          "Recipients are the company's primary owner plus every active Admin linked to the team that owns the service's environment.",
        ],
      },
      {
        type: "note",
        text: "If nobody receives emails for a service, make sure an Admin is assigned to the right team on the Users page.",
      },
    ],
  },
  {
    id: "notif-mute",
    category: "SECURITY",
    title: "How do I mute or snooze notifications for a package?",
    description: "Use the bell icon on a package to stop reminders or postpone them to a date.",
    keywords: ["mute", "snooze", "unmute", "bell", "stop emails", "postpone", "notifications off"],
    blocks: [
      {
        type: "steps",
        items: [
          "On the Packages page, click the bell icon on the package's row.",
          "To postpone reminders, choose a date and time in Snooze until, then click Snooze.",
          "To stop reminders entirely, click Mute indefinitely.",
          "To resume, click the bell again (it shows a crossed-out bell when muted) and click Unmute.",
        ],
      },
      {
        type: "note",
        text: "Muting is shared for the whole service and package, not personal. If you mute it, nobody gets reminders for it. The vulnerability itself still appears on the Security page.",
      },
    ],
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  {
    id: "users-add",
    category: "USERS",
    title: "How do I add a user to my company?",
    description: "Invite a colleague as an Admin or Member and assign them to teams.",
    keywords: ["new user", "invite", "colleague", "employee", "password", "first name", "last name", "role", "add user"],
    link: { label: "Open Users", path: "/users" },
    blocks: [
      {
        type: "steps",
        items: [
          "Click Users in the left sidebar, then Add User.",
          "First Name and Last Name.",
          "Email (required).",
          "Initial Password (required). The user can change it later with Forgot Password.",
          "Role (required): Admin or Member.",
          "Teams: choose one or more teams. Admins in a team receive its vulnerability emails.",
          "Click Add User.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins can see the Users menu.",
      },
    ],
  },
  {
    id: "users-edit-remove",
    category: "USERS",
    title: "How do I change a user's role or remove a user?",
    description: "Edit a user's role and teams, or remove them from the company.",
    keywords: ["edit user", "remove user", "delete user", "change role", "promote", "demote", "teams", "owner"],
    link: { label: "Open Users", path: "/users" },
    blocks: [
      {
        type: "list",
        items: [
          "Pencil icon: opens Edit User. You can change the Role (Admin or Member) and the Teams. The email is shown but is greyed out and can't be changed. Click Save Changes.",
          "Trash icon: removes the user from the company after confirmation.",
        ],
      },
      {
        type: "note",
        text: "The Owner role can't be changed here. Admins can only edit Members; only the Owner can edit Admins. The table shows each user's role, status, teams and join date.",
      },
    ],
  },

  // ── GitHub & automation ───────────────────────────────────────────────────
  {
    id: "gh-what",
    category: "GITHUB_AUTOMATION",
    title: "What does the GitHub / Bitbucket repository connection do?",
    description: "Automatically re-scan a service's packages when you push code (or, on GitHub, publish a release).",
    keywords: ["github", "bitbucket", "repository", "webhook", "push", "release", "automatic scan", "ci", "deployment", "what is"],
    popular: true,
    blocks: [
      {
        type: "paragraph",
        text: "You connect one GitHub or Bitbucket (Bitbucket Cloud) repository and branch to a service. When GitHub or Bitbucket tells us you pushed to that branch (on GitHub, also when you publish a release), we re-scan the packages already registered for that service. This keeps your security results fresh without anyone clicking anything.",
      },
      {
        type: "list",
        items: [
          "We never read your source code and we don't store any GitHub or Bitbucket token. Your Git host simply notifies us, and every notification is signed with a secret that only you and we know.",
          "Only the packages you registered on the service are scanned. Changes to your package.json in GitHub aren't imported automatically, so keep the packages list up to date.",
          "One connection per service (either GitHub or Bitbucket). The number of connections is limited by your plan's Monitored Branches.",
        ],
      },
    ],
  },
  {
    id: "gh-connect",
    category: "GITHUB_AUTOMATION",
    title: "How do I connect my GitHub repository?",
    description: "Connect a repository in our app, then add a webhook in GitHub with the URL and secret we show you.",
    keywords: ["connect repository", "payload url", "secret", "webhook setup", "settings webhooks", "owner", "branch", "application/json"],
    popular: true,
    blocks: [
      {
        type: "steps",
        items: [
          "Open the service's packages page and click Repository.",
          "Click Connect repository.",
          "Choose the Git provider GitHub, enter the Owner (your GitHub user or organization), the Repository name and the Watched branch (defaults to main), then click Connect.",
          "A window shows the Payload URL and the Secret. Copy both now. The secret is shown only once.",
          "In GitHub open your repository, then Settings, then Webhooks, then Add webhook.",
          "Paste the Payload URL, set Content type to application/json, and paste the Secret.",
          "Under events choose \"Let me select individual events\" and tick Pushes and Releases, then click Add webhook.",
          "Back in our app, click \"I've saved this\".",
        ],
      },
      {
        type: "note",
        text: "GitHub sends a test \"ping\" right away. A green tick in the webhook's Recent Deliveries means it works, and \"Last ping\" in our app updates.",
      },
    ],
  },
  {
    id: "bb-connect",
    category: "GITHUB_AUTOMATION",
    title: "How do I connect my Bitbucket repository?",
    description: "Pick Bitbucket as the Git provider, then add a webhook in Bitbucket Cloud with the URL and secret we show you.",
    keywords: ["bitbucket", "bitbucket cloud", "connect repository", "workspace", "slug", "webhook setup", "repository settings", "secret", "repo:push", "push"],
    popular: true,
    blocks: [
      {
        type: "steps",
        items: [
          "Open the service's packages page and click Repository, then Connect repository.",
          "Set Git provider to Bitbucket.",
          "Enter the Workspace (the workspace ID in your Bitbucket URL), the Repository slug and the Watched branch (defaults to main), then click Connect.",
          "A window shows the URL and the Secret. Copy both now. The secret is shown only once.",
          "In Bitbucket open your repository, then Repository settings, then Webhooks, then Add webhook.",
          "Give it a title, paste the URL and the Secret.",
          "Under Triggers choose \"Choose from a full list\", tick Repository: Push, then click Save.",
          "Back in our app, click \"I've saved this\".",
        ],
      },
      {
        type: "list",
        items: [
          "Only Bitbucket Cloud is supported. Bitbucket Server / Data Center is not available.",
          "Bitbucket has no \"release published\" event, so only pushes to the watched branch start a scan. Tags and branch deletions are ignored.",
          "In Bitbucket's webhook view, \"Test connection\" sends a ping. \"Last ping\" in our app updates when it succeeds.",
          "Cadence (Instant, Every N pushes, Time interval), Regenerate secret and Disconnect work exactly as for GitHub.",
        ],
      },
      {
        type: "note",
        text: "A service can have one connection, either GitHub or Bitbucket. To switch, disconnect the current repository first and connect the new one.",
      },
    ],
  },
  {
    id: "gh-modes",
    category: "GITHUB_AUTOMATION",
    title: "What are Instant, Every N pushes and Time interval?",
    description: "The three ways a push can turn into a package scan.",
    keywords: ["cadence", "trigger mode", "instant", "push count", "time interval", "batch", "edit cadence", "how often", "schedule"],
    popular: true,
    blocks: [
      {
        type: "list",
        items: [
          "Instant: every matching push starts a scan immediately.",
          "Every N pushes: pushes are counted, and a scan starts once N matching pushes have accumulated (the card shows progress such as 2/5). The counter then resets.",
          "Time interval: pushes are only remembered. A daily check starts a scan once the chosen number of days has passed since the last scan, and only if at least one matching push happened in the meantime.",
        ],
      },
      {
        type: "paragraph",
        text: "A \"matching\" push is a push to the watched branch. On GitHub, publishing a release also counts. Pushes to other branches are ignored.",
      },
      {
        type: "paragraph",
        text: "Change it anytime: on the Repository page click Edit cadence, choose the mode, enter the number of pushes or days, and click Save.",
      },
    ],
  },
  {
    id: "gh-defaults",
    category: "GITHUB_AUTOMATION",
    title: "Which scan schedule should I use for development, test and production?",
    description: "How the default cadence depends on the environment and your plan, and what we recommend.",
    keywords: ["development", "dev", "test", "testing", "staging", "production", "prod", "default", "per environment", "deployment", "recommended", "free plan"],
    popular: true,
    blocks: [
      {
        type: "paragraph",
        text: "When you connect a repository, its cadence is chosen once based on the service's environment and your plan. You can always change it afterwards on any plan.",
      },
      {
        type: "list",
        items: [
          "Production environment on a paid plan: Instant. Every push to the watched branch is scanned right away.",
          "Production environment on the free plan: follows your plan's default cadence, or the system default if your plan doesn't set one.",
          "Development, Testing, Staging and every other non-production environment: your plan's default cadence, or the system default of every 5 pushes (7 days if you switch to Time interval).",
        ],
      },
      {
        type: "paragraph",
        text: "What we recommend:",
      },
      {
        type: "list",
        items: [
          "Production: Instant, because live code is where a new vulnerable dependency matters most.",
          "Testing / staging: Every N pushes with a small N (for example 3 to 5), so a release candidate is checked before it ships.",
          "Development: Every N pushes with a larger N, or Time interval (for example every 7 days), to avoid scanning on every small commit.",
        ],
      },
      {
        type: "note",
        text: "The environment is picked by where the service lives, so connect the repository to the service in the matching environment. Mark only your live environment as Production.",
      },
    ],
  },
  {
    id: "gh-manage",
    category: "GITHUB_AUTOMATION",
    title: "How do I regenerate the secret or disconnect a repository?",
    description: "Rotate the webhook secret, edit the cadence or remove the connection.",
    keywords: ["regenerate secret", "rotate", "lost secret", "disconnect", "remove webhook", "edit cadence", "paused"],
    blocks: [
      {
        type: "list",
        items: [
          "Regenerate secret: creates a new secret and shows it once. Update the Secret in your GitHub or Bitbucket webhook settings right away, otherwise deliveries will be rejected.",
          "Edit cadence: changes the scan trigger mode.",
          "Disconnect: after confirmation, removes the connection. Deliveries to the old URL start failing, so also delete the webhook in GitHub or Bitbucket.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins can use these buttons. Lost your secret? Regenerate it: we can't show the old one again.",
      },
    ],
  },
  {
    id: "gh-status",
    category: "GITHUB_AUTOMATION",
    title: "What do \"Last ping\" and \"Last triggered scan\" mean?",
    description: "How to tell whether GitHub or Bitbucket is reaching us and whether a push caused a scan.",
    keywords: ["last ping", "last triggered", "status", "active", "paused", "pending push", "counter", "is it working"],
    blocks: [
      {
        type: "list",
        items: [
          "Last ping: the last time GitHub or Bitbucket successfully contacted us for this connection.",
          "Last triggered scan: the last time a push or release actually started a scan.",
          "A chip shows the cadence, for example \"Every 5 pushes (2/5 so far)\" or \"Every 7 day(s) — pending push queued\".",
          "The status chip shows ACTIVE when the connection is working.",
        ],
      },
      {
        type: "paragraph",
        text: "If Last ping is \"never\", GitHub hasn't reached us yet. See the troubleshooting article.",
      },
    ],
  },
  {
    id: "gh-troubleshoot",
    category: "GITHUB_AUTOMATION",
    title: "My GitHub or Bitbucket pushes don't start a scan. What should I check?",
    description: "Use the webhook delivery history in GitHub or Bitbucket to find out why.",
    keywords: ["not working", "404", "401", "failing", "troubleshoot", "recent deliveries", "redeliver", "localhost", "tunnel", "error"],
    blocks: [
      {
        type: "paragraph",
        text: "In GitHub open Settings, Webhooks, your webhook, then Recent Deliveries (Redeliver resends one). In Bitbucket open Repository settings, Webhooks, View requests on your webhook. Each delivery shows the response we returned.",
      },
      {
        type: "list",
        items: [
          "404: the URL is wrong, you pasted a GitHub URL into Bitbucket (or the other way round), or the connection was disconnected or paused.",
          "401: the Secret in GitHub or Bitbucket doesn't match. Regenerate the secret and paste the new one into GitHub.",
          "Timeout or connection error: GitHub can't reach our server. It must be reachable on the public internet over HTTPS.",
          "200 but no scan: normal for a ping, for a push to a different branch, or when your cadence is Every N pushes / Time interval and the threshold hasn't been reached yet.",
          "Also check that the service has at least one active package, because there is nothing to scan otherwise.",
        ],
      },
    ],
  },
  {
    id: "auto-overview",
    category: "GITHUB_AUTOMATION",
    title: "How does automatic scanning work?",
    description: "The three ways your packages get checked: on change, on a time window, and on a push or release.",
    keywords: ["automation", "automatic", "schedule", "time window", "rescan", "interval", "daily", "osv", "when are my packages checked", "pipeline", "deployment"],
    popular: true,
    blocks: [
      {
        type: "list",
        items: [
          "When you change packages: adding, editing or importing packages checks just those packages immediately.",
          "On a time window (scheduled rescan): your subscription plan promises a full rescan of every package in every active service every set number of days. Because new vulnerabilities are published after you add a package, this catches them without you doing anything. Plans without a rescan interval are only scanned on change or on a push. See Pricing & Plans for yours.",
          "On a push or release (GitHub or Bitbucket connection): a verified notification starts a full rescan of that service according to the cadence you chose: Instant, Every N pushes, or Time interval.",
        ],
      },
      {
        type: "paragraph",
        text: "After any of these scans, new findings appear on the service's Security page and the digest email process described in \"How do vulnerability emails work?\" takes over.",
      },
      {
        type: "note",
        text: "Scans use the packages you registered. If your dependencies change, update the packages list so the scan reflects reality.",
      },
    ],
  },
  {
    id: "auto-e2e",
    category: "GITHUB_AUTOMATION",
    title: "Does the platform run E2E security tests automatically?",
    description: "Current status of automated end-to-end security testing and how it will be triggered.",
    keywords: ["e2e", "end to end", "security tests", "xss", "sql injection", "csrf", "cors", "headers", "playwright", "swagger", "postman", "test run", "coming soon", "planned"],
    blocks: [
      {
        type: "note",
        text: "Status: not available yet. Today the platform automates package vulnerability scanning. Automated E2E test execution is planned.",
      },
      {
        type: "paragraph",
        text: "The planned E2E security testing will check your running services using ready-made tests (CSRF token presence, SQL injection probes, reflected XSS, security headers such as CSP, HSTS and X-Frame-Options, and CORS misconfiguration) plus custom tests you define by form, Swagger/OpenAPI import or Postman collection import.",
      },
      {
        type: "paragraph",
        text: "They are designed to start the same way package scans do: on a release or push to a monitored branch for each environment, manually, or on a schedule. This article will be updated as soon as the feature is released.",
      },
    ],
  },

  // ── Plans ─────────────────────────────────────────────────────────────────
  {
    id: "plans",
    category: "PLANS",
    title: "How do plans and limits work?",
    description: "What your subscription plan controls and where to compare or upgrade.",
    keywords: ["pricing", "subscription", "upgrade", "free", "paid", "limits", "pay as you go", "billing", "rescan interval", "monitored branches"],
    link: { label: "Open Pricing & Plans", path: "/pricing", absolute: true },
    blocks: [
      {
        type: "list",
        items: [
          "Maximum environments, services and monitored branches (connected repositories).",
          "How often all your packages are automatically rescanned (the time window).",
          "Default GitHub scan cadence for new connections.",
          "How many E2E test targets and tests you can create, and how many test runs you can start per month.",
        ],
      },
      {
        type: "paragraph",
        text: "Open Pricing & Plans in the sidebar to compare plans. Your current plan and usage are on the dashboard. Pay-as-you-go companies aren't blocked by plan limits.",
      },
    ],
  },

  // ── E2E security tests ──────────────────────────────────────────────────
  {
    id: "tests-overview",
    category: "TESTS",
    title: "How do I run E2E security tests on a service?",
    description:
      "Add the pages to test, build checks with the form simulator, and run them on demand from the Tests tab.",
    keywords: ["e2e", "test", "security test", "run", "endpoint", "assertion", "page", "form", "probe", "clone"],
    popular: true,
    blocks: [
      {
        type: "paragraph",
        text: "E2E security tests let you check that a page or endpoint behaves the way it should — for example, that a login form rejects empty credentials, or a protected endpoint returns 401 with no token. Open a service's Packages page and click Tests.",
      },
      {
        type: "steps",
        items: [
          "Click Add page and describe it: a name, the page type (Login, Register, Checkout, …), its path (relative to the service's base URL) or a full URL, the HTTP method, whether a token is required and the status expected without one, and how it authenticates (none, bearer token, API key header or basic). Any secret you enter is encrypted and never shown again.",
          "Select the page, then click Add e2e test. Build the request: method, headers, query params, and either the form simulator (target one of the page's forms — add each field: username, password, captcha, hidden, … with its value and body encoding) or a raw body. Set an optional timeout / token-validity.",
          "Build the auth/scenario matrix: add scenarios such as With valid token, Without token, With invalid token or With expired token (paste a known-expired token), each with its own expected status and optional body checks. The whole test runs once per scenario — so one test proves, say, 200 with a token and 401 without.",
          "Run a single test with its Run button, run one page with the page's Run button, or Run all tests at the top. Use the Clone button to copy a test and tweak it instead of rebuilding it.",
          "Watch the run under Recent runs; open a run to see each check pass or fail with expected vs. actual values.",
        ],
      },
      {
        type: "note",
        text: "Only Owners and Admins can add, edit, clone or run tests. Members can view pages, tests and results. Your plan controls how many pages and tests you can create and how many runs you can start each month.",
      },
    ],
  },
  {
    id: "tests-types",
    category: "TESTS",
    title: "Which kinds of E2E tests can I create?",
    description: "The difference between Custom API tests and the planned browser-based security tests.",
    keywords: ["custom api", "global security", "browser", "playwright", "test type", "engine"],
    blocks: [
      {
        type: "list",
        items: [
          "Custom API — a request you define with explicit assertions. These run today.",
          "Global security and Browser — pre-built browser-based checks (CSRF, reflected XSS, security headers and similar). These are planned and not available yet; such tests are skipped when a run executes until that engine ships.",
        ],
      },
      {
        type: "note",
        text: "Scheduled (cron) runs and runs triggered automatically by a GitHub/Bitbucket push are planned and not available yet — for now, runs are started manually from the Tests tab.",
      },
      {
        type: "note",
        text: "AI assistance (suggesting extra test cases, explaining results, improving a test) is available on demand. It stays switched off until your plan includes an AI-token allowance and that allowance has tokens remaining; when your tokens run out, AI features are disabled until you top them up. See \"How does AI assist help me build and understand tests?\".",
      },
    ],
  },
  {
    id: "tests-ai-assist",
    category: "TESTS",
    title: "How does AI assist help me build and understand tests?",
    description: "Suggest new test cases, explain a run's results, and improve an existing test — all on demand, metered against your plan's AI-token allowance.",
    keywords: ["ai", "assist", "suggest", "explain", "improve", "claude", "tokens", "allowance", "generate tests"],
    blocks: [
      {
        type: "paragraph",
        text: "On the Tests page, when AI assist is enabled for your plan, three on-demand helpers appear (Owners and Admins only):",
      },
      {
        type: "list",
        items: [
          "Suggest tests (AI) — in a page's Tests section, click it to get a list of suggested security tests. Expand any suggestion to read what it proves and why; tick the ones you want and click Add selected to create them (they are added as enabled tests you can edit or run like any other).",
          "Improve with AI — inside a test's Edit dialog, it rewrites the request and scenarios to strengthen the checks (for example adding a no-token negative scenario). Review the proposed changes, then Save to keep them.",
          "Explain results — in a finished run's detail window, it explains in plain language what passed and failed, the likely security impact, and what to fix.",
        ],
      },
      {
        type: "note",
        text: "AI assist is only shown when your plan includes an AI-token allowance and the platform is configured for AI. Each use spends tokens from your monthly allowance; the Tests header shows how many remain. When the allowance is exhausted the AI buttons are disabled until the allowance resets at the start of the next billing period or your administrator adds a top-up.",
      },
    ],
  },
];
