import { Incident, Validation, User } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Calculate weighted validation score for an incident
 * Returns score between -1 (all reject) and 1 (all accept)
 * @param {String} incidentId - Incident ID
 * @returns {Object} { score, count, status }
 */
export async function calculateValidationScore(incidentId) {
  const validations = await Validation.find({ incidentId });

  if (validations.length === 0) {
    return { score: 0, count: 0, status: 'pending' };
  }

  // Calculate weighted score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const val of validations) {
    const weight = val.getWeight(); // reputation × confidence
    weightedSum += val.vote * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Determine status based on score and validation count
  let status = 'pending';
  const minValidations = 3;

  if (validations.length >= minValidations) {
    if (score > 0.6) {
      status = 'verified';
    } else if (score < -0.3) {
      status = 'rejected';
    }
  }

  return { score, count: validations.length, status };
}

/**
 * Update incident validation status
 * @param {String} incidentId - Incident ID
 * @returns {Object} Updated incident info
 */
export async function validateIncident(incidentId) {
  try {
    const { score, count, status } = await calculateValidationScore(incidentId);

    const incident = await Incident.findByIdAndUpdate(
      incidentId,
      {
        validationScore: score,
        validationCount: count,
        status
      },
      { new: true }
    );

    if (!incident) {
      throw new Error('Incident not found');
    }

    logger.info('Incident validation updated', {
      incidentId,
      score,
      count,
      status
    });

    // Update reputation of validators if status changed
    if (status !== 'pending') {
      await updateValidatorReputations(incidentId, status);
    }

    return {
      incidentId,
      status,
      validationScore: score,
      validationCount: count
    };
  } catch (error) {
    logger.error('Error validating incident:', error);
    throw error;
  }
}

/**
 * Update reputation of validators and reporter based on final outcome
 * @param {String} incidentId - Incident ID
 * @param {String} finalStatus - Final status (verified/rejected)
 */
async function updateValidatorReputations(incidentId, finalStatus) {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    const validations = await Validation.find({ incidentId });
    const correctVote = finalStatus === 'verified' ? 1 : -1;

    // Update reporter reputation
    const reporter = await User.findOne({ uid: incident.reporterUid });
    if (reporter) {
      if (finalStatus === 'verified') {
        // Report was verified - increase reporter reputation
        await reporter.updateReputation(+10);
        logger.info('Reporter reputation increased (verified report)', {
          uid: reporter.uid,
          newReputation: reporter.reputacion
        });
      } else if (finalStatus === 'rejected') {
        // Report was rejected - decrease reporter reputation
        await reporter.updateReputation(-15);
        logger.info('Reporter reputation decreased (rejected report)', {
          uid: reporter.uid,
          newReputation: reporter.reputacion
        });
      }
    }

    // Update validators reputation
    for (const val of validations) {
      const user = await User.findOne({ uid: val.uid });
      if (!user) continue;

      if (val.vote === correctVote) {
        // Correct validation - increase reputation
        await user.updateReputation(+5);
        logger.info('Validator reputation increased', {
          uid: user.uid,
          newReputation: user.reputacion
        });
      } else {
        // Incorrect validation - decrease reputation
        await user.updateReputation(-10);
        logger.info('Validator reputation decreased', {
          uid: user.uid,
          newReputation: user.reputacion
        });
      }
    }
  } catch (error) {
    logger.error('Error updating validator reputations:', error);
  }
}

/**
 * Check if user can validate an incident
 * @param {String} uid - User ID
 * @param {String} incidentId - Incident ID
 * @returns {Boolean}
 */
export async function canUserValidate(uid, incidentId) {
  // Check if user already validated
  const existing = await Validation.findOne({ incidentId, uid });
  if (existing) return false;

  // Check if user is the reporter (can't validate own report)
  const incident = await Incident.findById(incidentId);
  if (incident && incident.reporterUid === uid) return false;

  return true;
}
