# Inventory Agent Notes

- Do not use Tailwind's `shadow-soft` for new persistent UI surfaces, app chrome, editor toolbars, floating editor tools, panels, notices, or always-visible controls. It can create broad dark visual artifacts in the app. Prefer flat bordered surfaces; reserve shadows only for truly transient menus/popovers after checking the result visually.
