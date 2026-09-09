// URL -> filesystem-safe slug, shared by the audit runner and the site builder
// (single source of truth for "which page is which file").
export function slugFor(url) {
  try {
    const u = new URL(url);
    // decodeURIComponent: the URL API percent-encodes spaces (& friends) in the
    // pathname — decode before slugging so "d e" doesn't become "d%20e".
    let pathPart;
    try {
      pathPart = decodeURIComponent(u.pathname);
    } catch {
      pathPart = u.pathname;
    }
    pathPart = pathPart.replace(/^\/+|\/+$/g, '').replace(/\.html?$/i, '');
    const slug = pathPart.replace(/[\/_\s.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return slug || 'home';
  } catch {
    return 'page';
  }
}
