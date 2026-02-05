#!/usr/bin/env node

/**
 * CSV to YAML Converter for Casting Shadows Cards
 * Converts cards-template.csv to YAML format
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function convertCsvToYaml(csvPath, yamlPath) {
    try {
        // Read CSV file
        const csvContent = fs.readFileSync(csvPath, 'utf8');

        // Parse CSV
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Convert to YAML structure
        const yamlData = {
            spells: records.map(record => {
                const spell = {
                    id: record.id,
                    name: record.name,
                    level: parseInt(record.level),
                    type: record.type,
                    description: record.description,
                    flavor_text: record.flavor_text || undefined
                };

                // Collection cost
                if (record.collection_cost_gem_color || record.collection_cost_orb_color || record.collection_cost_spell_level) {
                    spell.collection_cost = {};
                    if (record.collection_cost_gem_color && record.collection_cost_gem_amount) {
                        spell.collection_cost.gem = {
                            color: record.collection_cost_gem_color,
                            amount: parseInt(record.collection_cost_gem_amount)
                        };
                    }
                    if (record.collection_cost_orb_color && record.collection_cost_orb_amount) {
                        spell.collection_cost.orb = {
                            color: record.collection_cost_orb_color,
                            amount: parseInt(record.collection_cost_orb_amount)
                        };
                    }
                    if (record.collection_cost_spell_level && record.collection_cost_spell_level.trim()) {
                        spell.collection_cost.spell_level = parseInt(record.collection_cost_spell_level);
                    }
                }

                // Casting cost
                if (record.casting_cost_gem_color || record.casting_cost_orb_color) {
                    spell.casting_cost = {};
                    if (record.casting_cost_gem_color && record.casting_cost_gem_amount) {
                        spell.casting_cost.gem = {
                            color: record.casting_cost_gem_color,
                            amount: parseInt(record.casting_cost_gem_amount)
                        };
                    }
                    if (record.casting_cost_orb_color && record.casting_cost_orb_amount) {
                        spell.casting_cost.orb = {
                            color: record.casting_cost_orb_color,
                            amount: parseInt(record.casting_cost_orb_amount)
                        };
                    }
                }

                // Game mechanics
                spell.range = record.range || 'self';
                spell.target_type = record.target_type;
                spell.effect_type = record.effect_type;

                // Damage effects
                if (record.effect_type === 'damage') {
                    spell.damage = {
                        base: parseInt(record.base_damage) || 0
                    };
                    if (record.scaling_damage && parseInt(record.scaling_damage) > 0) {
                        spell.damage.scaling = parseInt(record.scaling_damage);
                    }
                    if (record.max_extra_resources && parseInt(record.max_extra_resources) > 0) {
                        spell.damage.max_extra_resources = parseInt(record.max_extra_resources);
                    }
                }

                // Conversion effects
                if (record.effect_type === 'convert') {
                    spell.conversion = {
                        from: {
                            type: record.convert_from_type,
                            amount: parseInt(record.convert_from_amount) || 0
                        },
                        to: {
                            type: record.convert_to_type,
                            amount: parseInt(record.convert_to_amount) || 0
                        }
                    };
                }

                return spell;
            })
        };

        // Convert to YAML string
        const yamlString = toYamlString(yamlData);

        // Write YAML file
        fs.writeFileSync(yamlPath, yamlString, 'utf8');

        console.log(`✅ Converted ${records.length} cards from ${csvPath} to ${yamlPath}`);

    } catch (error) {
        console.error('❌ Error converting CSV to YAML:', error.message);
        process.exit(1);
    }
}

function toYamlString(obj, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (typeof item === 'object') {
                const itemLines = toYamlString(item, indent + 1).trim().split('\n');
                const indentedLines = itemLines.map((line, index) => {
                    if (index === 0) {
                        return `${spaces}- ${line}`;
                    } else {
                        return `${spaces}  ${line}`;
                    }
                });
                return indentedLines.join('\n');
            } else {
                return `${spaces}- ${item}`;
            }
        }).join('\n');
    }

    if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj)
            .filter(([_, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => {
                const yamlKey = key.replace(/_/g, '-');
                if (Array.isArray(value)) {
                    const arrayStr = toYamlString(value, indent + 1);
                    return `${spaces}${yamlKey}:\n${arrayStr}`;
                } else if (typeof value === 'object') {
                    const objStr = toYamlString(value, indent + 1);
                    return `${spaces}${yamlKey}:\n${objStr}`;
                } else {
                    return `${spaces}${yamlKey}: ${value}`;
                }
            });
        return entries.join('\n');
    }

    return `${spaces}${obj}`;
}

// Main execution
if (require.main === module) {
    const csvPath = path.join(__dirname, '..', 'docs', 'games', 'castingShadows', 'cards-template.csv');
    const yamlPath = path.join(__dirname, '..', 'docs', 'games', 'castingShadows', 'cards', 'spells.yaml');

    // Ensure cards directory exists
    const cardsDir = path.dirname(yamlPath);
    if (!fs.existsSync(cardsDir)) {
        fs.mkdirSync(cardsDir, { recursive: true });
    }

    convertCsvToYaml(csvPath, yamlPath);
}

module.exports = { convertCsvToYaml };