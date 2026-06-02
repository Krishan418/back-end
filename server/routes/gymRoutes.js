import express from 'express';
import {
  createGymPass,
  listGymPasses,
  verifyGymScan,
  listGymAttendance,
  deleteGymPass,
  updateGymPass,
  createGymMember,
  listGymMembers,
  updateGymMember,
  deleteGymMember
} from '../controllers/gymController.js';

const router = express.Router();

router.post('/pass', createGymPass);
router.get('/passes', listGymPasses);
router.post('/verify-scan', verifyGymScan);
router.get('/attendance', listGymAttendance);
router.delete('/pass/:id', deleteGymPass);
router.put('/pass/:id', updateGymPass);

router.post('/member', createGymMember);
router.get('/members', listGymMembers);
router.put('/member/:id', updateGymMember);
router.delete('/member/:id', deleteGymMember);

export default router;
