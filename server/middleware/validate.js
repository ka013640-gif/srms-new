import { body, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  };
};

export const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const registerValidation = [
  body('fullname').notEmpty().withMessage('Full name is required'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const residentValidation = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be a positive number'),
  body('gender').notEmpty().withMessage('Gender is required'),
  body('birthday').notEmpty().withMessage('Birthday is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('civil_status').notEmpty().withMessage('Civil status is required')
];

export const projectValidation = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('status').isIn(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
];
