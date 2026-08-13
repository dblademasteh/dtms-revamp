with open('src/pages/Login.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact markers
start_marker = '        {/* Main Content - Tabbed Container */}'

# Find the start
start_idx = content.index(start_marker)
print(f"Start index: {start_idx}")

# Find the end - the closing of the main content div before the footer
end_marker = '        </TabbedContainer>\n        </div>\n        {/* Footer info */}'
end_idx = content.index(end_marker) + len(end_marker)
print(f"End index: {end_idx}")

# Show what's around the end marker
print(f"Context around end: {repr(content[end_idx-50:end_idx+20])}")
