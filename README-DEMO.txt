SOLARSYNC INFRA — LIVE LOCAL DEMO

RUN ON WINDOWS
1. Extract the ZIP to a folder.
2. Double-click run-demo.bat.
3. It starts a local server and opens http://localhost:8000 in your browser.
4. Keep the separate “SolarSync Infra Local Server” window open while testing.
   To stop the server, close that window or press Ctrl+C in it.

Python 3 must be installed on Windows. The batch file tries the Python launcher
(py) first, then falls back to python. If Python is missing, install it from
https://www.python.org/downloads/ and enable the PATH option during setup.

RUN ON MAC / LINUX
1. Open Terminal in this folder.
2. Run: python3 -m http.server 8000 --bind 127.0.0.1
3. Open http://localhost:8000

PUBLISH PUBLICLY (FREE STATIC HOSTING)
This is a static site and is ready for Netlify Drop: go to https://app.netlify.com/drop
and drag the extracted site folder (the folder containing index.html, assets/, and
favicon.png) into the page. Netlify will provide a public demo URL. If the site uses
a custom domain, configure that separately in the hosting dashboard.

Note: A local demo URL is only available on your computer; a public URL requires
a hosting provider account/deployment.
