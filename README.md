# Art Explorer

A full-stack web app for browsing and favoriting artworks from two public museum APIs.

## Features

- Search artworks across the **Metropolitan Museum of Art** and **Harvard Art Museums**
- View artwork details (title, artist, date, medium, dimensions)
- Save and manage a personal favorites list (persisted in `localStorage`)
- Responsive gallery layout with pagination

## Tech Stack

- **Backend:** Node.js + Express (serves API proxy routes)
- **Frontend:** Vanilla HTML/CSS/JS
- **APIs:** [Met Museum API](https://metmuseum.github.io/) · [Harvard Art Museums API](https://github.com/harvardartmuseums/api-docs)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your Harvard API key:
   ```
   HARVARD_API_KEY=your_key_here
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open `http://localhost:8080` in your browser.

## Docker

```bash
docker build -t art-explorer .
docker run -p 8080:8080 --env-file .env art-explorer
```
