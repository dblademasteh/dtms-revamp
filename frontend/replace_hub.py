with open('src/pages/Login.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the landing hub section
start = '          ) : (\n              /* ===== Landing Hub ===== */'
end = '          )}\n        </div>\n        {/* Footer info */}'

start_idx = content.index(start)
end_idx = content.index(end) + len(end)

new_hub = """          ) : (
            /* ===== Landing Hub ===== */
            <div className="space-y-6 text-center">
              <div className="space-y-3">
                <h1 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                  Document Tracking &amp; Management System
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track any document or create a new one — no login required.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/gateway"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
                >
                  <MapPin className="w-5 h-5" />
                  Track a Document Without Login
                </Link>
                <Link
                  to="/create"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm shadow-lg shadow-green-500/25 transition-all hover:scale-105"
                >
                  <FilePlus2 className="w-5 h-5" />
                  Create Document for Agency
                </Link>
              </div>
            </div>
          )}
        </div>
        {/* Footer info */}"""

content = content[:start_idx] + new_hub + content[end_idx:]

with open('src/pages/Login.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
