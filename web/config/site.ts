export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "FIRE",
  fullName: "Freedom Intelligent Routing Engine",
  description: "AI-powered ticket routing for support teams",
  navItems: [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  links: {
    github: "https://github.com",
    docs: "https://nextjs.org/docs",
  },
};

export const siteMetadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.fullName}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: { icon: "/favicon.ico" },
};
