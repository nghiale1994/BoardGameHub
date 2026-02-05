# Casting Shadows Cards - Compact CSV Format

## Tổng Quan

Format CSV rút gọn giảm từ **25 cột** xuống còn **12 cột** bằng cách gom nhóm data liên quan thành chuỗi compact.

## Cấu Trúc Các Cột

### Thông Tin Cơ Bản (6 cột)
- `id`: Unique identifier
- `name`: Tên hiển thị
- `level`: Level của spell (1-3)
- `type`: Loại card (`attack`, `conversion`)
- `description`: Mô tả chi tiết
- `flavor_text`: Text phong cách

### Costs (2 cột)
- `collection_cost`: Chi phí thu thập (format: `gem:color:amount,orb:color:amount,spell_level:level`)
- `casting_cost`: Chi phí cast (format: `gem:color:amount,orb:color:amount`)

### Game Mechanics (4 cột)
- `range`: Phạm vi (`self`, `adjacent`, `range2`, `all`)
- `target_type`: Loại target (`enemy`, `hex`)
- `effect_type`: Loại hiệu ứng (`damage`, `convert`)
- `damage`: Thông số damage (format: `base:value,scaling:value,max_extra:value`)
- `conversion`: Thông số conversion (format: `from:type:amount,to:type:amount`)

## Format Chi Tiết

### Collection Cost
```
gem:red:2,orb:blue:1,spell_level:1
```
→ `{gem: {color: 'red', amount: 2}, orb: {color: 'blue', amount: 1}, spell_level: 1}`

### Casting Cost
```
gem:red:1
orb:purple:2
```
→ `{gem: {color: 'red', amount: 1}}` hoặc `{orb: {color: 'purple', amount: 2}}`

### Damage
```
base:3,scaling:2,max_extra:2
```
→ `{base: 3, scaling: 2, max_extra: 2}`

### Conversion
```
from:curseCrystal:1,to:shadowFragment:1
```
→ `{from: {type: 'curseCrystal', amount: 1}, to: {type: 'shadowFragment', amount: 1}}`

## Ví Dụ Cards

```csv
id,name,level,type,collection_cost,casting_cost,range,target_type,effect_type,damage,conversion,description,flavor_text
fireball,Fireball,1,attack,gem:red:1,orb:red:1,gem:red:1,adjacent,enemy,damage,base:3,scaling:2,max_extra:2,,Deal 3 damage to an enemy in range. Spend up to 2 additional Red Gems to deal +2 damage each.,A blazing sphere of fire that engulfs its target.
ice-blast,Ice Blast,1,attack,gem:blue:1,orb:blue:1,gem:blue:1,adjacent,enemy,damage,base:2,scaling:1,max_extra:3,,A chilling blast of ice that freezes the target.,Cold winds howl through the battlefield.
healing-wave,Healing Wave,1,conversion,gem:purple:1,orb:purple:1,self,self,convert,,from:curseCrystal:1,to:gem:1,Waves of restorative energy wash away corruption.,Purifying light banishes the shadows.
```

## Quy Tắc

### Delimiters
- **Colon `:`**: Tách type, subtype, value
- **Comma `,`**: Tách các thành phần trong cùng nhóm

### Optional Fields
- Để trống nếu không có (ví dụ: `conversion` trống cho attack spells)
- Không cần spell_level nếu không yêu cầu

### Colors
- `red`, `blue`, `purple` cho gems/orbs

### Numbers
- Amount luôn là số dương
- Level: 1, 2, 3

## Convert Thành YAML

```bash
cd scripts
npm run convert-cards-compact
```

Output: `docs/games/castingShadows/cards/spells-compact.yaml`

## So Sánh Formats

| Format | Số cột | Ưu điểm | Nhược điểm |
|--------|--------|---------|------------|
| **Full CSV** | 25 | Dễ hiểu, ít lỗi | Quá nhiều cột, khó quản lý |
| **Compact CSV** | 12 | Ít cột hơn 50%, vẫn dễ edit | Cần hiểu format delimiter |

## Tips

- **Bắt đầu với compact**: Dễ quản lý hơn cho nhiều cards
- **Validate thường xuyên**: Chạy convert để check format
- **Backup**: Giữ version khi thay đổi lớn
- **Template**: Copy từ `cards-compact.csv` để thêm cards mới

## Migration

Nếu đã có data ở format cũ:
1. Copy data từ full CSV
2. Convert từng cost/effect thành format compact
3. Paste vào compact CSV
4. Test convert để đảm bảo đúng