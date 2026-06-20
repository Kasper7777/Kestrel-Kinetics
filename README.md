# Kestrel Kinetics

Static GitHub Pages site for **Cyber Bully**.

## Files

- `index.html` - root page served by GitHub Pages.
- `assets/styles.css` - responsive site styling.
- `assets/script.js` - small header/year enhancement.
- `assets/images/cyber-bully-hero.png` - generated hero artwork for the game page.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your main branch and the repository root, then save.

GitHub will publish the site at the Pages URL shown in that settings screen.

## Automatic Development Log

The website reads `assets/commits.json` to show the Cyber Bully development history without linking to the private source repository. The GitHub Action in `.github/workflows/update-development-log.yml` refreshes that file hourly and can also be run manually.

Because the source repository is private, add repository secrets named `CYBER_BULLY_SOURCE_REPO` and `CYBER_BULLY_SOURCE_TOKEN`. The token only needs read-only Contents access to the source repository.
