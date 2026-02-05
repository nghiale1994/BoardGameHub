# Casting Shadows Cards CSV Template

## Tổng Quan

Có 2 format CSV để chọn:

### 1. Full CSV (25 cột) - Dễ hiểu
- File: `cards-template.csv`
- Script: `npm run convert-cards`
- Ưu điểm: Mỗi field một cột, dễ edit
- Nhược điểm: Quá nhiều cột

### 2. Compact CSV (12 cột) - Tối ưu
- File: `cards-compact.csv`
- Script: `npm run convert-cards-compact`
- Ưu điểm: Ít cột hơn 50%, vẫn dễ edit
- Nhược điểm: Cần hiểu format delimiter

## Khuyến Nghị

**Dùng Compact CSV** cho việc thêm nhiều cards - dễ quản lý và ít lỗi hơn!

---

## Format Full CSV (25 cột)

1. **Copy file `cards-template.csv`** để tạo file mới cho cards của bạn
2. **Điền thông tin** vào các cột theo hướng dẫn dưới đây
3. **Save as CSV** và gửi cho tôi convert thành YAML

## Cấu Trúc Các Cột

### Thông Tin Cơ Bản
- `id`: Unique identifier (không dấu, lowercase, dùng dấu gạch ngang)
- `name`: Tên hiển thị của card
- `level`: Level của spell (1-3)
- `type`: Loại card (`attack`, `conversion`)

### Collection Cost (Chi Phí Thu Thập)
- `collection_cost_gem_color`: Màu gem cần (`red`, `blue`, `purple`, hoặc để trống)
- `collection_cost_gem_amount`: Số lượng gem cần
- `collection_cost_orb_color`: Màu orb cần (`red`, `blue`, `purple`, hoặc để trống)
- `collection_cost_orb_amount`: Số lượng orb cần
- `collection_cost_spell_level`: Level spell cần discard (để trống nếu không cần)

### Casting Cost (Chi Phí Cast)
- `casting_cost_gem_color`: Màu gem để cast
- `casting_cost_gem_amount`: Số gem để cast
- `casting_cost_orb_color`: Màu orb để cast
- `casting_cost_orb_amount`: Số orb để cast

### Game Mechanics
- `range`: Phạm vi (`self`, `adjacent`, `range2`, `all`)
- `target_type`: Loại target (`enemy` cho single target, `hex` cho area)
- `effect_type`: Loại hiệu ứng (`damage`, `convert`)

### Damage Effects (cho attack spells)
- `base_damage`: Damage cơ bản
- `scaling_damage`: Damage thêm mỗi resource extra
- `max_extra_resources`: Số resource extra tối đa

### Conversion Effects (cho conversion spells)
- `convert_from_type`: Resource type cần convert (`curseCrystal`, etc.)
- `convert_from_amount`: Số lượng cần convert
- `convert_to_type`: Resource type nhận được
- `convert_to_amount`: Số lượng nhận được

### Text & Flavor
- `description`: Mô tả chi tiết cách hoạt động
- `flavor_text`: Text phong cách/vị trí

## Ví Dụ Điền Card Mới

```csv
id,name,level,type,collection_cost_gem_color,collection_cost_gem_amount,collection_cost_orb_color,collection_cost_orb_amount,collection_cost_spell_level,casting_cost_gem_color,casting_cost_gem_amount,casting_cost_orb_color,casting_cost_orb_amount,range,target_type,effect_type,base_damage,scaling_damage,max_extra_resources,convert_from_type,convert_from_amount,convert_to_type,convert_to_amount,description,flavor_text
ice-blast,Ice Blast,1,attack,blue,1,blue,1,,blue,1,,,,adjacent,enemy,damage,2,1,3,,,,Deal 2 damage to an enemy. Spend up to 3 additional Blue Gems to deal +1 damage each.,A chilling blast of ice that freezes the target.
healing-wave,Healing Wave,1,conversion,purple,1,,,purple,1,,,,self,self,convert,,0,0,curseCrystal,1,gem,1,Convert 1 Cursed Crystal into 1 Gem of any color.,Waves of restorative energy wash away corruption.
```

## Quy Tắc Điền

### Colors
- `red`, `blue`, `purple` cho gems/orbs
- Để trống nếu không cần

### Numbers
- `0` hoặc để trống nếu không có limit
- Số dương cho amounts

### Text Fields
- `description`: Viết rõ ràng, dễ hiểu
- `flavor_text`: Viết sinh động, immersive

### Special Cases
- **Purple resources**: Có thể dùng làm red HOẶC blue
- **Spell level cost**: Chỉ điền số level (1, 2, 3)
- **Hex targeting**: `target_type = "hex"`
- **Conversion spells**: `effect_type = "convert"`

## Convert Thành YAML

Sau khi điền xong CSV, gửi file cho tôi và tôi sẽ:
1. Parse CSV data
2. Convert thành YAML format
3. Tạo file YAML tương ứng
4. Validate data structure

## File Structure

```
docs/games/castingShadows/
├── cards-template.csv      # Template để điền
├── cards/
│   ├── spells.yaml         # Output từ CSV
│   ├── companions.yaml
│   └── counterspells.yaml
└── README.md              # Hướng dẫn này
```

## Tips

- **Bắt đầu nhỏ**: Tạo 2-3 cards trước để test
- **Validate thường xuyên**: Check logic trước khi convert
- **Backup**: Giữ version của CSV khi thay đổi lớn
- **Comment**: Thêm comment trong CSV nếu cần ghi chú

## Support

Nếu cần thêm cột hoặc thay đổi format, hãy cho tôi biết!

---

## 📖 Xem Thêm

- **[Compact CSV Format](CSV_COMPACT_README.md)**: Format rút gọn 12 cột
- **[Game Design](design.md)**: Chi tiết mechanics
- **[Implementation](IMPLEMENTATION.md)**: Code architecture