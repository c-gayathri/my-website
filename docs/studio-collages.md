# Studio collage settings

Set these fields in a project's MDX frontmatter. `gallery` remains the source list of images.

| Field | Use |
| --- | --- |
| `collageMode: grid` | Row grid, the default. |
| `collageMode: masonry` | Images flow down each column at their natural heights. |
| `collageMode: custom` | Place each named tile explicitly. |
| `collageColumns: 2` | Number of columns for grid or masonry. |
| `collageWidthPercent: 55` | Width within the project stage, capped at 100% and centered. |
| `collageColumnRatios: [57, 43]` | Relative custom column widths. |
| `collageRowRatios: [2, 1, 1]` | Optional relative custom row heights. |

For `custom`, add `collageTiles`. Each tile has a `name`, `type`, `row`, and `column`. Rows and columns start at 1. `rowSpan` and `columnSpan` default to 1. Image tiles use `imageIndex`, starting at 0 in `gallery`. Video tiles use `videoSrc` for a local file or `youtubeUrl` for an embed. On narrow screens, tiles stack in their frontmatter order.

```yaml
collageMode: custom
collageColumns: 2
collageColumnRatios: [57, 43]
collageTiles:
  - name: Wide image
    type: image
    imageIndex: 0
    row: 1
    column: 1
    columnSpan: 2
  - name: Animation
    type: video
    videoSrc: /studio/videos/example.mp4
    row: 2
    column: 2
```
