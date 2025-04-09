'use strict';

const STAFF_OPERATIONS_EVENTS = {
  RECRUIT_STAFF: 'merchant:staff:recruit',
  UPDATE_STAFF_ROLE: 'merchant:staff:update_role',
  REMOVE_STAFF: 'merchant:staff:remove',
  ASSIGN_TASK: 'merchant:staff:assign_task',
  GET_TASKS: 'merchant:staff:get_tasks',
  SET_AVAILABILITY: 'merchant:staff:set_availability',
  GET_PERFORMANCE: 'merchant:staff:get_performance',
  GENERATE_REPORT: 'merchant:staff:generate_report',
  SUCCESS: 'merchant:staff:success',
  ERROR: 'merchant:staff:error',
};

module.exports = STAFF_OPERATIONS_EVENTS;