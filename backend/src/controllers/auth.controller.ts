import { Request, Response } from 'express';

// For a real application, this would verify passwords against the DB and issue a JWT.
// For now, it issues a dummy token to allow the frontend to bypass the login screen.
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    // Return a dummy token and user info
    res.json({
      success: true,
      data: {
        token: 'mock-jwt-token-123',
        user: {
          id: 'user-1',
          email,
          fullName: 'Demo Recruiter',
          role: 'RECRUITER'
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const verifySession = async (req: Request, res: Response) => {
  res.json({ success: true, data: { valid: true } });
};
