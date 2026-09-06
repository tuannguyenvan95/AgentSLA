"""
AgentSLA Deployment Script & Studio Guide (studionet)

TARGET NETWORK:
  Network Name: GenLayer Studio Network (studionet)
  Chain ID: 61999 (0xF1EF)
  RPC Endpoint: https://studio.genlayer.com/api
  Explorer: https://genlayer-explorer.vercel.app

CRITICAL DEPLOYMENT INSTRUCTIONS:
1. Open GenLayer Studio: https://studio.genlayer.com/run-debug
2. Navigate to 'Settings' -> Click 'Reset Storage' -> Confirm -> Hard Refresh (Ctrl+F5 / Cmd+Shift+R).
3. Create a new contract file named `contract.py` and paste the contents of `contracts/contract.py`.
4. Ensure line 1 has the required pragma comment:
   # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
5. Click 'Deploy Contract'.
6. IMPORTANT: Once the transaction is mined:
   - Click the transaction in the sidebar.
   - Verify `Result: SUCCESS` (do not confuse with `Status: FINALIZED`).
7. Copy the deployed contract address (e.g., 0x...).
8. Update `frontend/src/config/genlayer.ts`:
   export const AGENTSLA_CONTRACT_ADDRESS = "0x...";
"""

import sys
import os

def display_guide():
    print("=" * 70)
    print("🚀 AgentSLA - GenLayer Studionet Deployment Guide")
    print("=" * 70)
    print("\n[Network Lock: studionet]")
    print("  • Chain ID: 61999 (0xF1EF)")
    print("  • RPC: https://studio.genlayer.com/api")
    print("  • Studio: https://studio.genlayer.com/run-debug")
    print("\n[Zero-Tolerance Rules Reminder]")
    print("  ✓ R14: No bare int in storage (use bigint for money, sized ints for bounds)")
    print("  ✓ R15: Transfer via gl.get_contract_at(addr).emit_transfer(value=...)")
    print("  ✓ R18: Custom struct decorated with @allow_storage and @dataclass")
    print("  ✓ R19: All public-facing TreeMap keys are strings")
    print("  ✓ R21: MetaMask must be pre-funded from Studio Accounts panel")
    print("  ✓ R22: No private keys in frontend VITE_* environment variables")
    print("=" * 70)

if __name__ == "__main__":
    display_guide()
