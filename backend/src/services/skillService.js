/**
 * skillService.js — Business logic for skills.
 */

import * as skillRepo from "../repositories/skillRepository.js";

function formatSkill(skill) {
  return {
    id: skill.id,
    name: skill.name,
    normalizedName: skill.normalized_name,
    category: skill.category,
  };
}

export async function getAllSkills(search = "") {
  const skills = await skillRepo.findSkills(search);

  return skills.map(formatSkill);
}