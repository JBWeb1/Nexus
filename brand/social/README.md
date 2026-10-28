# Nexus social media logo pack

Made from the Nexus logo (glowing blue N with the NEXUS wordmark). Every image is the exact size each platform asks for.
Profile pictures keep the whole logo inside the circle that most platforms crop to.

## Profile pictures (`profile/`)

| Platform | File | Size |
|---|---|---|
| Instagram | `instagram-profile-1080.png` | 1080 × 1080 |
| Facebook page | `facebook-profile-720.png` | 720 × 720 |
| LinkedIn (personal) | `linkedin-profile-400.png` | 400 × 400 |
| LinkedIn company page logo | `linkedin-company-logo-300.png` | 300 × 300 |
| X (Twitter) | `x-twitter-profile-400.png` | 400 × 400 |
| TikTok | `tiktok-profile-720.png` | 720 × 720 |
| YouTube channel | `youtube-profile-800.png` | 800 × 800 |
| WhatsApp Business | `whatsapp-business-640.png` | 640 × 640 |
| Google Business Profile | `google-business-720.png` | 720 × 720 |
| Pinterest | `pinterest-profile-600.png` | 600 × 600 |

## Covers and banners (`covers/`)

| Platform | File | Size | Notes |
|---|---|---|---|
| Facebook page cover | `facebook-cover-1640x624.png` | 1640 × 624 | Content is centred, so phones (which crop the sides) still show it |
| Facebook event cover | `facebook-event-cover-1920x1005.png` | 1920 × 1005 | |
| X (Twitter) header | `x-twitter-header-1500x500.png` | 1500 × 500 | Shifted right and up, clear of the profile picture |
| LinkedIn personal banner | `linkedin-banner-1584x396.png` | 1584 × 396 | Shifted right, clear of the profile photo |
| LinkedIn company cover | `linkedin-company-cover-1128x191.png` | 1128 × 191 | |
| YouTube channel banner | `youtube-banner-2560x1440.png` | 2560 × 1440 | Logo and text sit inside the 1546 × 423 area every device shows |

## Posts, stories and links (`posts/`)

| Use | File | Size |
|---|---|---|
| Instagram / Facebook / LinkedIn square post | `square-post-1080x1080.png` | 1080 × 1080 |
| Instagram / Facebook portrait post | `portrait-post-1080x1350.png` | 1080 × 1350 |
| Instagram & Facebook stories, Reels, TikTok, WhatsApp status | `story-reel-tiktok-1080x1920.png` | 1080 × 1920 |
| Pinterest pin | `pinterest-pin-1000x1500.png` | 1000 × 1500 |
| Link preview (Open Graph: WhatsApp, Facebook, LinkedIn, X, Slack) | `link-preview-og-1200x630.png` | 1200 × 630 |
| Email signature | `email-signature-600x200.png` | 600 × 200 |

## Icons (`icons/`)

The tiny sizes use the N on its own, because the NEXUS wordmark can't be read at 16 px.

| Use | File |
|---|---|
| Browser tab | `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png` |
| iPhone home screen | `apple-touch-icon-180.png` |
| Android / web app | `android-chrome-192.png`, `android-chrome-512.png` |
| App stores | `app-icon-1024.png` |

## Logo files (`logo/`)

| File | Use it for |
|---|---|
| `nexus-logo-on-black-1254.png` | The original logo on black |
| `nexus-logo-transparent-1254.png` / `nexus-logo-transparent-cropped.png` | Placing the logo on your own **dark** designs. The background is transparent and the glow is kept |
| `nexus-icon-n-transparent.png` | The N on its own, transparent |

The NEXUS lettering is white, so the transparent files are for dark backgrounds. On white or light backgrounds, use a square or
icon file, which carries its own black background.

## Making them again

`brand/make-social-pack.mjs` renders the whole pack with Chromium from the transparent logo files:
`node make-social-pack.mjs <folder with logo-full.png, logo-n.png, manrope.woff2> brand/social`
