find "$(pwd)" -mindepth 2 -type d -name node_modules -prune -false -o -name .git -prune -false -o -name "block.config.json" -print0 | xargs -0 --replace={} bash -c  "dirname {}"
