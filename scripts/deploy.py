"""
AgentSLA Deployment Script & Studio Guide (Studio Next)

TARGET NETWORK:
  Network Name: GenLayer Studio Next
  Chain ID: 61997 (0xF22D)
  RPC Endpoint: https://studio-next.genlayer.com/api
  Explorer: https://explorer-studio-dev.genlayer.com

CRITICAL DEPLOYMENT INSTRUCTIONS:
1. Open GenLayer Studio Next: https://studio-next.genlayer.com
2. Create or open contract file named `contract.py` and paste the contents of `contracts/contract.py`.
3. Ensure line 1 has the required pragma comment:
   # { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
4. Click 'Deploy Contract' (or run `scripts/deploy_studio_next.py`).
5. IMPORTANT: Once the transaction is mined:
   - Click the transaction in the sidebar or check explorer.
   - Verify status ACCEPTED and execution FINISHED_WITH_RETURN.
6. Copy the deployed contract address:
   Deployed live: 0xeb81da1f8AceC5C8C1b45Dcab23054a8fccf8e4d
7. Update `frontend/src/config/genlayer.ts`:
   export const AGENTSLA_CONTRACT_ADDRESS = "0xeb81da1f8AceC5C8C1b45Dcab23054a8fccf8e4d";
"""

import sys
import os

def display_guide():
    print("=" * 70)
    print("🚀 AgentSLA - GenLayer Studio Next Deployment Guide")
    print("=" * 70)
    print("\n[Network Lock: Studio Next]")
    print("  • Chain ID: 61997 (0xF22D)")
    print("  • RPC: https://studio-next.genlayer.com/api")
    print("  • Explorer: https://explorer-studio-dev.genlayer.com")
    print("  • Official Contract: 0xeb81da1f8AceC5C8C1b45Dcab23054a8fccf8e4d")
    print("=" * 70)

if __name__ == "__main__":
    display_guide()
