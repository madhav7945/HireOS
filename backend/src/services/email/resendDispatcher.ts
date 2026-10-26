/**
 * resendDispatcher.ts
 * 
 * Mock implementation of the Transactional Email Engine.
 * In production, this would use the official `resend` Node.js SDK.
 */

export const resendDispatcher = {
  sendEmail: async ({ to, subject, template, payload }: { to: string, subject: string, template: string, payload: any }) => {
    console.log(`\n=================================================`);
    console.log(`✉️  [RESEND MOCK] Dispatching Transactional Email`);
    console.log(`=================================================`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Template: ${template}`);
    console.log(`Payload: `, payload);
    console.log(`=================================================\n`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      messageId: `mock-email-id-${Date.now()}`
    };
  }
};
