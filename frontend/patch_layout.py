with open('/Users/apple/Documents/Projects/argus/frontend/src/layouts/AgentLayout.tsx', 'r') as f:
    content = f.read()

new_link = """
            <Link
              to="/agent/history"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${location.pathname === "/agent/history" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Archive className="h-4 w-4" />
              All Tickets
            </Link>"""

# Find the end of Escalated Queue link and inserting the new link
target = 'Escalated Queue\n            </Link>'
content = content.replace(target, target + new_link)

with open('/Users/apple/Documents/Projects/argus/frontend/src/layouts/AgentLayout.tsx', 'w') as f:
    f.write(content)
