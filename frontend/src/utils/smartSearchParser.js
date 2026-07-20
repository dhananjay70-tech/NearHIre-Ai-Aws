/**
 * smartSearchParser.js
 * Deterministic lightweight parser for natural-language job search phrases.
 *
 * Examples:
 *  "React internship in Gurugram" → { skill: "React", jobType: "INTERNSHIP", city: "Gurugram" }
 *  "Remote Node.js job" → { skill: "Node.js", workMode: "REMOTE" }
 *  "Frontend internship within 20 km" → { keyword: "Frontend", jobType: "INTERNSHIP", radiusKm: 20 }
 *  "Python fresher role near Noida" → { skill: "Python", maxExperience: 0, city: "Noida" }
 *  "Hybrid backend under 50 km" → { keyword: "backend", workMode: "HYBRID", radiusKm: 50 }
 *
 * Returns a partial filter object. Never overrides existing filters.
 */

const WORK_MODE_PATTERNS = [
  { pattern: /\b(remote|work from home|wfh|fully remote)\b/i, value: 'REMOTE' },
  { pattern: /\b(hybrid|partial remote|semi.remote)\b/i, value: 'HYBRID' },
  { pattern: /\b(on.?site|in.?office|office)\b/i, value: 'ON_SITE' },
];

const JOB_TYPE_PATTERNS = [
  { pattern: /\b(internship|intern)\b/i, value: 'INTERNSHIP' },
  { pattern: /\b(full.?time|permanent|full time)\b/i, value: 'FULL_TIME' },
  { pattern: /\b(part.?time|part time)\b/i, value: 'PART_TIME' },
  { pattern: /\b(contract|freelance|gig)\b/i, value: 'CONTRACT' },
];

const FRESHER_PATTERNS = [
  /\b(fresher|entry.?level|0 year|0-1 year|no experience|beginner|junior)\b/i,
];

const RADIUS_PATTERN = /\b(?:within|under|less than|below|in)\s+(\d+)\s*km\b/i;

// Common Indian tech cities
const KNOWN_CITIES = [
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune',
  'noida', 'gurgaon', 'gurugram', 'kolkata', 'ahmedabad', 'surat', 'jaipur',
  'lucknow', 'kochi', 'chandigarh', 'indore', 'bhopal', 'visakhapatnam',
  'nagpur', 'coimbatore', 'thiruvananthapuram', 'mysuru', 'mysore',
  'sohna', 'faridabad', 'ghaziabad', 'meerut', 'agra', 'patna', 'ranchi',
  'vadodara', 'rajkot', 'mohali', 'panchkula', 'thane', 'navi mumbai',
];

// Known skills for detection
const KNOWN_SKILLS = [
  'react', 'react.js', 'reactjs', 'node.js', 'nodejs', 'node', 'python', 'java',
  'javascript', 'typescript', 'angular', 'vue', 'vue.js', 'django', 'flask',
  'fastapi', 'express', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker',
  'kubernetes', 'aws', 'gcp', 'azure', 'tensorflow', 'pytorch', 'machine learning',
  'deep learning', 'data science', 'devops', 'flutter', 'kotlin', 'swift', 'go',
  'golang', 'rust', 'php', 'laravel', 'spring', 'springboot', 'graphql', 'sql',
  'html', 'css', 'figma', 'unity', 'unreal', 'c++', 'c#', 'scala', 'bash', 'linux',
];

// Skill aliases to canonical names
const SKILL_CANONICAL = {
  'react': 'React', 'react.js': 'React', 'reactjs': 'React',
  'node': 'Node.js', 'node.js': 'Node.js', 'nodejs': 'Node.js',
  'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript',
  'typescript': 'TypeScript', 'angular': 'Angular', 'vue': 'Vue.js', 'vue.js': 'Vue.js',
  'django': 'Django', 'flask': 'Flask', 'fastapi': 'FastAPI',
  'express': 'Express.js', 'mongodb': 'MongoDB', 'postgresql': 'PostgreSQL',
  'mysql': 'MySQL', 'redis': 'Redis', 'docker': 'Docker', 'kubernetes': 'Kubernetes',
  'aws': 'AWS', 'gcp': 'GCP', 'azure': 'Azure', 'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning', 'data science': 'Data Science',
  'golang': 'Go', 'go': 'Go', 'rust': 'Rust', 'php': 'PHP', 'graphql': 'GraphQL',
  'sql': 'SQL', 'html': 'HTML', 'css': 'CSS', 'figma': 'Figma', 'c++': 'C++', 'c#': 'C#',
};

/**
 * Parse a natural language search query into structured filters.
 * @param {string} query - Raw search input
 * @returns {{ parsed: object, chips: Array<{key, label, value}>, hasResults: boolean }}
 */
export function parseSmartSearch(query) {
  if (!query || query.trim().length < 3) {
    return { parsed: {}, chips: [], hasResults: false };
  }

  const q = query.trim();
  const parsed = {};
  const chips = [];

  // 1. Detect radius
  const radiusMatch = q.match(RADIUS_PATTERN);
  if (radiusMatch) {
    const radius = parseInt(radiusMatch[1], 10);
    if (radius >= 5 && radius <= 200) {
      parsed.radiusKm = radius;
      chips.push({ key: 'radiusKm', label: `${radius} km radius`, value: radius });
    }
  }

  // 2. Detect work mode
  for (const { pattern, value } of WORK_MODE_PATTERNS) {
    if (pattern.test(q)) {
      parsed.workMode = value;
      chips.push({ key: 'workMode', label: value.replace('_', ' '), value });
      break;
    }
  }

  // 3. Detect job type
  for (const { pattern, value } of JOB_TYPE_PATTERNS) {
    if (pattern.test(q)) {
      parsed.jobType = value;
      chips.push({ key: 'jobType', label: value.replace('_', ' '), value });
      break;
    }
  }

  // 4. Detect fresher/entry-level
  for (const pattern of FRESHER_PATTERNS) {
    if (pattern.test(q)) {
      parsed.maxExperience = 1;
      chips.push({ key: 'maxExperience', label: 'Fresher / 0–1 yr exp', value: 1 });
      break;
    }
  }

  // 5. Detect skill (multi-word first)
  const qLower = q.toLowerCase();
  let detectedSkill = null;
  // Try multi-word skills first (e.g., "machine learning", "data science")
  for (const skill of KNOWN_SKILLS.sort((a, b) => b.length - a.length)) {
    const idx = qLower.indexOf(skill);
    if (idx >= 0) {
      // Make sure it's a word boundary
      const before = idx === 0 ? ' ' : q[idx - 1];
      const after = idx + skill.length >= q.length ? ' ' : q[idx + skill.length];
      if (/[\s,.()\-]/.test(before) || idx === 0) {
        if (/[\s,.()\-]/.test(after) || idx + skill.length === q.length) {
          detectedSkill = SKILL_CANONICAL[skill] || skill;
          chips.push({ key: 'skill', label: `Skill: ${detectedSkill}`, value: detectedSkill });
          parsed.skill = detectedSkill;
          break;
        }
      }
    }
  }

  // 6. Detect city (check after removing detected elements)
  // Look for "in [city]" or "near [city]" patterns
  const cityPattern = /\b(?:in|near|at|from)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:and|or|with|for|within|under)|\s*$)/i;
  const cityMatch = q.match(cityPattern);
  if (cityMatch) {
    const candidateCity = cityMatch[1].trim().toLowerCase();
    if (KNOWN_CITIES.includes(candidateCity) || candidateCity.length >= 4) {
      const cityFormatted = cityMatch[1].trim().replace(/\b\w/g, c => c.toUpperCase());
      parsed.city = cityFormatted;
      chips.push({ key: 'city', label: `City: ${cityFormatted}`, value: cityFormatted });
    }
  }

  // 7. Use remaining non-keyword parts as the search keyword
  // Strip the detected parts and use what's left as a general keyword
  let remaining = q;
  // Strip common filler words
  remaining = remaining.replace(RADIUS_PATTERN, '');
  for (const { pattern } of WORK_MODE_PATTERNS) remaining = remaining.replace(pattern, '');
  for (const { pattern } of JOB_TYPE_PATTERNS) remaining = remaining.replace(pattern, '');
  for (const pattern of FRESHER_PATTERNS) remaining = remaining.replace(pattern, '');
  if (parsed.city) remaining = remaining.replace(new RegExp(`\\b(?:in|near|at|from)\\s+${parsed.city}\\b`, 'i'), '');
  if (parsed.skill) remaining = remaining.replace(new RegExp(`\\b${parsed.skill.replace('.', '\\.')}\\b`, 'i'), '');
  remaining = remaining.replace(/\b(job|role|position|opportunity|opening|vacancy|work|career)\b/gi, '');
  remaining = remaining.replace(/\s+/g, ' ').trim();

  if (remaining.length >= 2 && !parsed.skill) {
    parsed.keyword = remaining;
    parsed.search = remaining;
    chips.push({ key: 'search', label: `"${remaining}"`, value: remaining });
  } else if (remaining.length >= 2) {
    // Use as additional context for search if skill already detected
    parsed.search = parsed.skill || remaining;
  }

  const hasResults = Object.keys(parsed).length > 0;

  return { parsed, chips, hasResults };
}

export default parseSmartSearch;
