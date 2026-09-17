import pytest
import sys
import os
from types import ModuleType

# Setup GenLayer mock environment if genlayer SDK is not installed locally
# Setup GenLayer mock environment if genlayer SDK is not installed locally
if "genlayer" not in sys.modules:
    gl_mock = ModuleType("genlayer")
    gl_storage_mock = ModuleType("genlayer.storage")

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
    gl_storage_mock.TreeMap = dict
    gl_storage_mock.DynArray = list
    gl_storage_mock.allow = lambda cls: cls

    class MockStorage:
        @staticmethod
        def allow(cls):
            return cls
        TreeMap = dict
        DynArray = list

    class MockContractAt:
        def __init__(self, addr):
            self.addr = addr
        def emit_transfer(self, value=0):
            pass

    class MockContractModule:
        class Contract:
            def __init_subclass__(cls, **kwargs):
                super().__init_subclass__(**kwargs)
                for attr, typ in getattr(cls, "__annotations__", {}).items():
                    if "TreeMap" in str(typ):
                        setattr(cls, attr, {})
                    elif "DynArray" in str(typ):
                        setattr(cls, attr, [])

        @staticmethod
        def get_at(addr):
            return MockContractAt(addr)

    UserErrorCls = type("UserError", (Exception,), {})
    gl_mock.UserError = UserErrorCls

    class MockVM:
        UserError = UserErrorCls
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
                "spec_score": 90,
                "quality_score": 95,
                "test_score": 90,
                "reason": "Sub-agent deliverable meets all SLA specifications."
            }

    gl_mock.public = MockPublic()
    gl_mock.message = MockMessage()
    gl_mock.block = MockBlock()
    gl_mock.nondet = MockNondet()
    gl_mock.vm = MockVM()
    gl_mock.storage = MockStorage()
    gl_mock.contract = MockContractModule()
    gl_mock.allow_storage = lambda cls: cls
    gl_mock.get_contract_at = lambda addr: MockContractAt(addr)
    gl_mock.gl = gl_mock

    sys.modules["genlayer"] = gl_mock
    sys.modules["genlayer.storage"] = gl_storage_mock

# Ensure contracts directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
