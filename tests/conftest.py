import pytest
import sys
import os
from types import ModuleType

# Setup GenLayer mock environment if genlayer SDK is not installed locally
if "genlayer" not in sys.modules:
    gl_mock = ModuleType("genlayer")
    gl_mock.allow_storage = lambda cls: cls
    
    class Address(str):
        @property
        def as_hex(self):
            return str(self)

    gl_mock.Address = Address
    gl_mock.bigint = int
    gl_mock.u8 = int
    gl_mock.u32 = int
    gl_mock.u64 = int
    gl_mock.u256 = int
    gl_mock.TreeMap = dict
    gl_mock.DynArray = list
    gl_mock.UserError = type("UserError", (Exception,), {})
    
    class MockPublic:
        @staticmethod
        def view(fn):
            return fn
            
        class Write:
            def __call__(self, fn):
                return fn
            @staticmethod
            def payable(fn):
                return fn
        write = Write()
        
    class MockMessage:
        _sender = Address("0x1111111111111111111111111111111111111111")
        value = 1000000000000000000  # 1 GEN

        @property
        def sender(self):
            return self._sender

        @sender.setter
        def sender(self, val):
            self._sender = val

        @property
        def sender_address(self):
            return self._sender

        @sender_address.setter
        def sender_address(self, val):
            self._sender = val

    class MockBlock:
        number = 123456

    class MockWeb:
        @staticmethod
        def render(url, mode="text"):
            return "Mock GitHub PR diff: Added comprehensive tests and fixed SLA acceptance criteria."

    class MockNondet:
        web = MockWeb()
        @staticmethod
        def exec_prompt(prompt, response_format=None):
            return {
                "verdict": "APPROVED",
                "confidence": 95,
                "reason": "Sub-agent deliverable meets all SLA specifications."
            }

    class MockContractAt:
        def __init__(self, addr):
            self.addr = addr
        def emit_transfer(self, value=0):
            pass

    class MockVM:
        class Return:
            def __init__(self, calldata):
                self.calldata = calldata
                
        @staticmethod
        def run_nondet(leader_fn, validator_fn):
            leader_res = MockVM.Return(leader_fn())
            valid = validator_fn(leader_res)
            if not valid:
                raise Exception("Validator consensus Disagree")
            return leader_res.calldata

    class MockGL:
        class Contract:
            def __init_subclass__(cls, **kwargs):
                super().__init_subclass__(**kwargs)
                # Auto-initialize TreeMap and DynArray annotations if present
                for attr, typ in getattr(cls, "__annotations__", {}).items():
                    if "TreeMap" in str(typ):
                        setattr(cls, attr, {})
                    elif "DynArray" in str(typ):
                        setattr(cls, attr, [])

        public = MockPublic()
        message = MockMessage()
        block = MockBlock()
        nondet = MockNondet()
        vm = MockVM()
        UserError = gl_mock.UserError

        @staticmethod
        def get_contract_at(addr):
            return MockContractAt(addr)

    gl_mock.gl = MockGL()
    sys.modules["genlayer"] = gl_mock

# Ensure contracts directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
