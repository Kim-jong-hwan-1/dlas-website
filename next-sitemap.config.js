/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.dlas.io',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin', '/admin/*', '/adminIPview', '/partner', '/payment/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/adminIPview', '/partner', '/payment'],
      },
    ],
  },
};