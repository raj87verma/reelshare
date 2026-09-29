import http from 'http';
import { shell } from 'electron';

export interface LoopbackAuthOptions {
  // The redirect URI the user configured in Settings > API Keys for this
  // platform (e.g. http://localhost:3000/auth/youtube/callback). This must
  // exactly match what's registered in the platform's developer app
  // settings -- we don't choose this ourselves, we just listen on whatever
  // host/port/path it specifies so the platform's redirect actually reaches
  // us.
  redirectUri: string;
  // The fully-built platform authorization URL to send the user to.
  authUrl: string;
  timeoutMs?: number;
}

// Real desktop-app OAuth Authorization Code flow: opens the platform's
// actual login/consent page in the user's real system browser (never an
// embedded webview -- platforms increasingly block or flag those), then
// captures the redirect via a temporary local HTTP server listening on the
// redirect URI's own host/port/path. This is the same "loopback redirect"
// pattern used by tools like the GitHub CLI and `gcloud` for desktop OAuth.
//
// Resolves with the authorization `code` on success, or rejects with a
// descriptive error (denied, timed out, port conflict, malformed redirect
// URI, etc.) that the caller can show directly to the user.
export function runLoopbackAuth({ redirectUri, authUrl, timeoutMs = 5 * 60 * 1000 }: LoopbackAuthOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(redirectUri);
    } catch {
      reject(new Error(`The configured Redirect URI ("${redirectUri}") is not a valid URL. Fix it in Settings > API Keys.`));
      return;
    }

    if (target.protocol !== 'http:') {
      reject(new Error(
        'The Redirect URI must use http:// (not https://) for ReelShare to capture the login redirect locally, ' +
        'e.g. http://localhost:3000/auth/youtube/callback.'
      ));
      return;
    }

    const port = target.port ? Number(target.port) : 80;
    const expectedPath = target.pathname;

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
    };

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }

      const reqUrl = new URL(req.url, `http://${target.host}`);
      if (reqUrl.pathname !== expectedPath) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');
      const errorDescription = reqUrl.searchParams.get('error_description');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end(
          '<html><body style="font-family:sans-serif;text-align:center;padding-top:80px;">' +
          '<h2>&#9989; Connected!</h2><p>You can close this window and return to ReelShare.</p>' +
          '</body></html>'
        );
      } else {
        res.end(
          '<html><body style="font-family:sans-serif;text-align:center;padding-top:80px;">' +
          '<h2>&#10060; Authorization failed</h2>' +
          `<p>${errorDescription || error || 'Unknown error'}</p>` +
          '<p>You can close this window and return to ReelShare.</p>' +
          '</body></html>'
        );
      }

      cleanup();
      if (code) {
        resolve(code);
      } else {
        reject(new Error(errorDescription || error || 'Authorization was cancelled or denied'));
      }
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Authorization timed out after 5 minutes. Please try connecting again.'));
    }, timeoutMs);

    server.on('error', (err: NodeJS.ErrnoException) => {
      cleanup();
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `Port ${port} (from the Redirect URI configured in Settings > API Keys) is already in use on this ` +
          'machine, so ReelShare can\'t listen for the login redirect there. Close whatever else is using that ' +
          'port, or change the Redirect URI to a different port and update it to match in your platform\'s ' +
          'developer app settings too.'
        ));
      } else {
        reject(err);
      }
    });

    server.listen(port, target.hostname, () => {
      shell.openExternal(authUrl);
    });
  });
}
