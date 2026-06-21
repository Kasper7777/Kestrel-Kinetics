# Kestrel Kinetics

Static site for **Kestrel Kinetics Research & Technology**, with separate pages for **Cyber Bully: 502 Bad Gateway**, **Manic Monday's** and **Milenko Sketch**.

## Files

- `index.html` - Kestrel Kinetics studio homepage.
- `cyber-bully/index.html` - Cyber Bully: 502 Bad Gateway game page.
- `manic-mondays/index.html` - Manic Monday's game page.
- `milenko-sketch/index.html` - Milenko Sketch app page.
- `assets/styles.css` - responsive site styling.
- `assets/script.js` - small header/year enhancement.
- `assets/images/studio/kestrel-logo.png` - Kestrel Kinetics logo.
- `assets/images/cyber-bully/gallery/` - drop Cyber Bully screenshots or promo images here.
- `assets/images/manic-mondays/` - Manic Monday's art and screenshots.
- `assets/images/milenko-sketch/` - Milenko Sketch hero and screenshots.
- `assets/gallery.json` - generated gallery manifest used by the Cyber Bully page.
- `assets/commits.json` - generated Cyber Bully development log feed.
- `assets/commits-manic-mondays.json` - generated Manic Monday's development log feed.
- `assets/gallery-milenko-sketch.json` - generated Milenko Sketch gallery manifest.
- `assets/icons/kestrel.ico` - site favicon.
- `api/contact.js` - Vercel serverless contact endpoint.
- `netlify/functions/contact.js` - Netlify serverless contact endpoint.
- `server/contact-handler.js` - shared private Discord webhook sending logic.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your main branch and the repository root, then save.

GitHub will publish the site at the Pages URL shown in that settings screen.

## Private Contact Form

The contact and support form posts to `/api/contact`. The public HTML and JavaScript do not contain the private Discord webhook URL. Form messages include the enquiry type and selected software/project.

To actually send messages into Discord, deploy the site somewhere that can run the included serverless endpoint, such as Netlify or Vercel. GitHub Pages alone cannot keep a webhook URL private because it only serves static files.

Set this private environment variable in the deployment provider:

- `DISCORD_WEBHOOK_URL` - Discord channel webhook URL that receives form messages.

Do not add the real webhook URL to the repository. A local `.env` file is ignored by git, and `.env.example` only contains a blank placeholder.

## Automatic Development Logs

The game pages read generated JSON feeds to show development history without linking to the private source repositories. The GitHub Action in `.github/workflows/update-development-log.yml` refreshes these files hourly and can also be run manually.

Because the source repositories are private, add repository secrets for each feed:

- `CYBER_BULLY_SOURCE_REPO` and `CYBER_BULLY_SOURCE_TOKEN` write `assets/commits.json`.
- `MANIC_MONDAYS_SOURCE_REPO` and `MANIC_MONDAYS_SOURCE_TOKEN` write `assets/commits-manic-mondays.json`.

The token only needs read-only Contents access to its source repository.
For Manic Monday's, the workflow also accepts the singular fallback names `MANIC_MONDAY_SOURCE_REPO` and `MANIC_MONDAY_SOURCE_TOKEN`. If no Manic Monday's token is configured, it falls back to `CYBER_BULLY_SOURCE_TOKEN`.
Source repo secrets can use either `owner/repo` or a GitHub clone URL.

## Cyber Bully Gallery

Add images to `assets/images/cyber-bully/gallery/` and push them to GitHub. The workflow rebuilds `assets/gallery.json`, and the Cyber Bully page places the images automatically into the magazine-style visual section.

## Milenko Sketch Gallery

Replace `assets/images/milenko-sketch/hero.png` when you have final page art. Add screenshots or promo images to `assets/images/milenko-sketch/gallery/` and push them to GitHub. The workflow rebuilds `assets/gallery-milenko-sketch.json`, and the Milenko Sketch page places the images automatically into the magazine-style visual section.
