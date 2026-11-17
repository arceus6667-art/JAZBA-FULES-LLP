/** Simultaneous non-modifier shortcut with repeat protection and focus reset. */
export function createAdminShortcut() {
  const keys = new Set();
  let armed = true;
  return {
    down(key, isEditing = false) {
      if (isEditing) return false;
      keys.add(key.toLowerCase());
      if (armed && ["z", "x", "c"].every((k) => keys.has(k))) {
        armed = false;
        return true;
      }
      return false;
    },
    up(key) {
      keys.delete(key.toLowerCase());
      if (!keys.size) armed = true;
    },
    reset() {
      keys.clear();
      armed = true;
    },
  };
}
