/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /users/sign-up:
 *   post:
 *     summary: Sign up
 *     description: Creates a board user account and signs it in. Available only when sign-up is enabled.
 *     tags:
 *       - Users
 *     operationId: signUp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 256
 *                 description: Email address for login and notifications
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 maxLength: 256
 *                 description: Password for user authentication (must meet password requirements)
 *                 example: SecurePassword123!
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Full display name of the user
 *                 example: John Doe
 *               withHttpOnlyToken:
 *                 type: boolean
 *                 description: Whether to include an HTTP-only authentication cookie
 *                 example: true
 *     responses:
 *       200:
 *         description: Sign-up successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   type: string
 *                   description: Access token for API authentication
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ4...
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         description: Sign-up disabled, or another authentication restriction
 *       409:
 *         description: Email already in use, rate limit exceeded or active users limit reached
 *     security: []
 */

const { isPassword } = require('../../../utils/validators');
const { getRemoteAddress } = require('../../../utils/remote-address');

const Errors = {
  SIGN_UP_DISABLED: {
    signUpDisabled: 'Sign up disabled',
  },
  EMAIL_ALREADY_IN_USE: {
    emailAlreadyInUse: 'Email already in use',
  },
  ACTIVE_USERS_LIMIT_REACHED: {
    activeUsersLimitReached: 'Active users limit reached',
  },
  RATE_LIMIT_EXCEEDED: {
    rateLimitExceeded: 'Rate limit exceeded',
  },
};

module.exports = {
  inputs: {
    email: {
      type: 'string',
      maxLength: 256,
      isEmail: true,
      required: true,
    },
    password: {
      type: 'string',
      maxLength: 256,
      custom: isPassword,
      required: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
      required: true,
    },
    withHttpOnlyToken: {
      type: 'boolean',
    },
  },

  exits: {
    signUpDisabled: {
      responseType: 'forbidden',
    },
    emailAlreadyInUse: {
      responseType: 'conflict',
    },
    activeUsersLimitReached: {
      responseType: 'conflict',
    },
    rateLimitExceeded: {
      responseType: 'conflict',
    },
    termsAcceptanceRequired: {
      responseType: 'forbidden',
    },
    totpVerificationRequired: {
      responseType: 'forbidden',
    },
    adminLoginRequiredToInitializeInstance: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    if (!sails.config.custom.signUpEnabled) {
      throw Errors.SIGN_UP_DISABLED;
    }

    const remoteAddress = getRemoteAddress(this.req);

    const { isExceeded } = sails.helpers.utils.checkRateLimit.with({
      key: `auth:ip:${remoteAddress}`,
      windowSeconds: sails.config.custom.authRateLimitWindow,
      max: sails.config.custom.authRateLimitMaxPerIp,
    });

    if (isExceeded) {
      sails.log.warn(`Sign-up rate limit hit (IP: ${remoteAddress})`);
      throw Errors.RATE_LIMIT_EXCEEDED;
    }

    const user = await sails.helpers.users.createOne
      .with({
        values: {
          email: inputs.email,
          password: inputs.password,
          role: User.Roles.BOARD_USER,
          name: inputs.name.trim(),
        },
        actorUser: User.INTERNAL,
        request: this.req,
      })
      .intercept('emailAlreadyInUse', () => Errors.EMAIL_ALREADY_IN_USE)
      .intercept('activeLimitReached', () => Errors.ACTIVE_USERS_LIMIT_REACHED);

    return sails.helpers.accessTokens.handleSteps
      .with({
        user,
        remoteAddress,
        request: this.req,
        response: this.res,
        withHttpOnlyToken: inputs.withHttpOnlyToken,
      })
      .intercept('adminLoginRequiredToInitializeInstance', (error) => ({
        adminLoginRequiredToInitializeInstance: error.raw,
      }))
      .intercept('termsAcceptanceRequired', (error) => ({
        termsAcceptanceRequired: error.raw,
      }))
      .intercept('totpVerificationRequired', (error) => ({
        totpVerificationRequired: error.raw,
      }));
  },
};
