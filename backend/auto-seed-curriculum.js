/**
 * Auto-seed curriculum data on first launch.
 * Checks if curriculum_topics is empty and seeds all Grades 1-6 data if so.
 * This ensures the app works out-of-the-box when shared as an .exe.
 */

const { grade1Quarters } = require('../scripts/seed-grade1-quarters');
const { grade2Quarters } = require('../scripts/seed-grade2-quarters');
const { grade3Quarters } = require('../scripts/seed-grade3-quarters');
const { grade4Quarters } = require('../scripts/seed-grade4-quarters');
const { grade5Quarters } = require('../scripts/seed-grade5-quarters');
const { grade6Quarters } = require('../scripts/seed-grade6-quarters');

const allGrades = [
    { grade: 1, quarters: grade1Quarters },
    { grade: 2, quarters: grade2Quarters },
    { grade: 3, quarters: grade3Quarters },
    { grade: 4, quarters: grade4Quarters },
    { grade: 5, quarters: grade5Quarters },
    { grade: 6, quarters: grade6Quarters },
];

/**
 * Seeds all curriculum data into the database if the curriculum_topics table is empty.
 * @param {object} db - The sqlite3 database instance
 * @returns {Promise<void>}
 */
function seedCurriculumIfEmpty(db) {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM curriculum_topics', [], (err, row) => {
            if (err) {
                console.error('Error checking curriculum_topics count:', err);
                // Table might not exist yet on very first run, resolve gracefully
                resolve();
                return;
            }

            if (row && row.count > 0) {
                console.log(`Curriculum already seeded (${row.count} topics). Skipping auto-seed.`);
                resolve();
                return;
            }

            console.log('Curriculum topics table is empty. Auto-seeding Grades 1-6...');

            const stmt = db.prepare(
                `INSERT OR IGNORE INTO curriculum_topics 
         (grade, topic_code, topic_title, learning_outcome, category, order_index, quarter)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
            );

            let inserted = 0;

            for (const { grade, quarters } of allGrades) {
                for (const [quarterName, topics] of Object.entries(quarters)) {
                    const quarterNum = parseInt(quarterName.replace('quarter', ''), 10);
                    for (const topic of topics) {
                        stmt.run(
                            [
                                grade,
                                topic.topic_code,
                                topic.topic_title,
                                topic.learning_outcome,
                                topic.category,
                                topic.order_index,
                                quarterNum,
                            ],
                            function (insertErr) {
                                if (!insertErr && this.changes > 0) {
                                    inserted++;
                                }
                            }
                        );
                    }
                }
            }

            stmt.finalize((finalizeErr) => {
                if (finalizeErr) {
                    console.error('Error finalizing curriculum seed:', finalizeErr);
                    reject(finalizeErr);
                    return;
                }
                console.log(`✅ Auto-seeded ${inserted} curriculum topics for Grades 1-6.`);
                resolve();
            });
        });
    });
}

module.exports = { seedCurriculumIfEmpty };
