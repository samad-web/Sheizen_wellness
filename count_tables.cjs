
const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'src', 'integrations', 'supabase', 'types.ts');

try {
    const content = fs.readFileSync(typesPath, 'utf8');

    // Find the Tables section
    // It usually looks like:
    // public: {
    //   Tables: {
    //     table_name: {

    const tablesMatch = content.match(/Tables:\s*{([\s\S]*?)}\s*Views:/) || content.match(/Tables:\s*{([\s\S]*?)}\s*Functions:/) || content.match(/Tables:\s*{([\s\S]*?)}\s*Enums:/) || content.match(/Tables:\s*{([\s\S]*?)}\s*\}\s*\}\s*\}\s*$/);

    if (!tablesMatch) {
        // Fallback: just look for the block inside public
        const publicBlock = content.match(/public:\s*{([\s\S]*?)}/);
        if (publicBlock) {
            const tablesBlock = publicBlock[1].match(/Tables:\s*{([\s\S]*?)}/);
            // This is harder to parse with regex due to nesting
        }
    }

    // A simpler way given the generated format:
    // Look for keys that are direct children of Tables.
    // In the file content I saw:
    //       achievement_progress: {
    //         Row: {
    // This implies table names are keys followed by : { and then Row: {

    // Let's use a regex that looks for indentation and structure
    // Based on the file view:
    // 16:     Tables: {
    // 17:       achievement_progress: {
    // 18:         Row: {

    // We can look for lines that match "      name: {" (6 spaces)
    // followed shortly by "        Row: {" (8 spaces)

    const lines = content.split('\n');
    const tables = [];
    let insideTables = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Tables: {')) {
            insideTables = true;
            continue;
        }

        if (insideTables) {
            // Check for end of Tables block (closing brace with 4 spaces)
            if (line.match(/^\s{4}\},?/)) {
                insideTables = false;
                break;
            }

            // Check for table definition
            // Matches: 6 spaces, name, colon, open brace
            const match = line.match(/^\s{6}(\w+): \{/);
            if (match) {
                tables.push(match[1]);
            }
        }
    }

    console.log(`Found ${tables.length} tables in types.ts:`);
    tables.forEach((t, i) => console.log(`${i + 1}. ${t}`));

} catch (err) {
    console.error('Error reading types file:', err);
}
