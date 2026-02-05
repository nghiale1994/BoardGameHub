# BoardGameHub Scripts

Scripts hỗ trợ development cho BoardGameHub project.

## Setup

```bash
cd scripts
npm install
```

## Scripts Available

### CSV to YAML Converters

Convert CSV card data thành YAML format cho game data.

#### Full Format (25 cột)
```bash
npm run convert-cards
```
- Input: `../docs/games/castingShadows/cards-template.csv`
- Output: `../docs/games/castingShadows/cards/spells.yaml`

#### Compact Format (12 cột)
```bash
npm run convert-cards-compact
```
- Input: `../docs/games/castingShadows/cards-compact.csv`
- Output: `../docs/games/castingShadows/cards/spells-compact.yaml`

**Requirements:**
- CSV file phải có đúng format như trong `cards-template.csv`
- Cần cài đặt dependencies: `npm install`

**Output:**
- Tạo folder `cards/` nếu chưa có
- Ghi file `spells.yaml` với data đã convert
- Log số lượng cards đã convert

## Development

Để add script mới:
1. Tạo file `.js` trong folder này
2. Add vào `"scripts"` trong `package.json`
3. Update README này

## Dependencies

- `csv-parse`: Parse CSV files
- `fs`: Node.js file system (built-in)
- `path`: Node.js path utilities (built-in)