import crypto from 'crypto';

export class OfferSignerService {
  /**
   * Generates a unique, high-entropy magic token for the offer URL.
   */
  static generateOfferToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Creates an immutable SHA-256 hash representing the candidate's digital signature.
   * This hash ensures that if any part of the signature string or IP changes, it voids the contract.
   * 
   * @param rawSignatureData Base64 representation of the canvas signature or typed name
   * @param candidateIp The IP address of the candidate at the time of signing
   */
  static generateSignatureHash(rawSignatureData: string, candidateIp: string): string {
    const timestamp = new Date().toISOString();
    
    const payload = JSON.stringify({
      signature: rawSignatureData,
      ip: candidateIp,
      timestamp,
    });

    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    
    return hash;
  }
}
