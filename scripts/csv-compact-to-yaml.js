#!/usr/bin/env node

/**
 * Compact CSV to YAML Converter for Casting Shadows Cards
 * Converts cards-compact.csv to YAML format
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function parseCompactCost(costString) {
    if (!costString || costString.trim() === '') return undefined;

    const cost = {};
    const parts = costString.split(',');

    for (const part of parts) {
        const [type, ...values] = part.trim().split(':');

        if (type === 'gem' || type === 'orb') {
            cost[type] = {
                color: values[0],
                amount: parseInt(values[1])
            };
        } else if (type === 'spell_level') {
            cost.spell_level = parseInt(values[0]);
        }
    }

    return cost;
}

function parseCompactDamage(damageString) {
    if (!damageString || damageString.trim() === '') return undefined;

    const damage = {};
    const parts = damageString.split(',');

    for (const part of parts) {
        const [key, value] = part.trim().split(':');
        damage[key] = parseInt(value);
    }

    return damage;
}

function parseCompactConversion(conversionString) {
    if (!conversionString || conversionString.trim() === '') return undefined;

    const conversion = {};
    const parts = conversionString.split(',');

    for (const part of parts) {
        const [direction, type, amount] = part.trim().split(':');
        conversion[direction] = {
            type: type,
            amount: parseInt(amount)
        };
    }

    return conversion;
}

function convertCompactCsvToYaml(csvPath, yamlPath) {
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

                // Parse compact costs
                const collectionCost = parseCompactCost(record.collection_cost);
                if (collectionCost) {
                    spell.collection_cost = collectionCost;
                }

                const castingCost = parseCompactCost(record.casting_cost);
                if (castingCost) {
                    spell.casting_cost = castingCost;
                }

                // Game mechanics
                spell.range = record.range || 'self';
                spell.target_type = record.target_type;
                spell.effect_type = record.effect_type;

                // Parse damage
                const damage = parseCompactDamage(record.damage);
                if (damage) {
                    spell.damage = damage;
                }

                // Parse conversion
                const conversion = parseCompactConversion(record.conversion);
                if (conversion) {
                    spell.conversion = conversion;
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
    const csvPath = path.join(__dirname, '..', 'docs', 'games', 'castingShadows', 'cards-compact.csv');
    const yamlPath = path.join(__dirname, '..', 'docs', 'games', 'castingShadows', 'cards', 'spells-compact.yaml');

    // Ensure cards directory exists
    const cardsDir = path.dirname(yamlPath);
    if (!fs.existsSync(cardsDir)) {
        fs.mkdirSync(cardsDir, { recursive: true });
    }

    convertCompactCsvToYaml(csvPath, yamlPath);
}

module.exports = { convertCompactCsvToYaml };