#!/bin/bash
set -e

echo "=== E2E: Profile Editing ==="

# Assume we're already logged in (run login test first or use saved state)
agent-browser open http://localhost:3000/editor
agent-browser wait --load networkidle

# Snapshot the editor
agent-browser snapshot -i
agent-browser screenshot tests/e2e/screenshots/editor-initial.png

# Edit display name
agent-browser find label "Display Name" fill ""  # Clear first
agent-browser find label "Display Name" fill "Cole Updated"

# Edit bio
agent-browser find label "Bio" fill ""
agent-browser find label "Bio" fill "This is my updated bio for testing"

# Edit avatar URL
agent-browser find label "Avatar URL" fill ""
agent-browser find label "Avatar URL" fill "https://i.pravatar.cc/300"

# Verify preview updates (check for text in preview panel)
agent-browser wait 500  # Let preview update
agent-browser screenshot tests/e2e/screenshots/editor-preview-updated.png

# Check that preview contains the updated name
SNAPSHOT=$(agent-browser snapshot)
if echo "$SNAPSHOT" | grep -q "Cole Updated"; then
  echo "PASS: Preview shows updated name"
else
  echo "FAIL: Preview does not show updated name"
  exit 1
fi

# Click Save
agent-browser find role button click --name "Save"
agent-browser wait 2000  # Wait for save to complete

# Verify toast appears (success message)
agent-browser screenshot tests/e2e/screenshots/editor-saved.png

# Reload and verify persistence
agent-browser open http://localhost:3000/editor
agent-browser wait --load networkidle
agent-browser wait 1000

SNAPSHOT=$(agent-browser snapshot)
if echo "$SNAPSHOT" | grep -q "Cole Updated"; then
  echo "PASS: Data persisted after reload"
else
  echo "FAIL: Data not persisted"
  exit 1
fi

echo "=== Profile Editing: PASSED ==="
