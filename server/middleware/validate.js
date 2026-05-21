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
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isString().withMessage('Role must be a string')
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

export const createAccountValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullname').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Email is required'),
  body('birthday').isISO8601().withMessage('Birthday is required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('address').notEmpty().withMessage('Address is required'),
  body('civil_status').isIn(['Single', 'Married', 'Widowed', 'Separated', 'Divorced']).withMessage('Invalid civil status'),
  body('accountType').isIn(['resident', 'official']).withMessage('Account type must be resident or official'),
  body('contact').optional().isString(),
  body('occupation').optional().isString(),
  body('position').if(body('accountType').equals('official')).notEmpty().withMessage('Position is required for officials'),
  body('term_start').if(body('accountType').equals('official')).optional().isISO8601(),
  body('term_end').if(body('accountType').equals('official')).optional().isISO8601()
];
