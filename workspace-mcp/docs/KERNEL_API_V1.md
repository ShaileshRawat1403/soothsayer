# Kernel API v1 (Reference Specification)

Version: 1.0 (aligned with Python 0.1.2 reference)
Contract Version: 1.1

Status: Draft (Reference)

## 1. Scope

### 1.1 In Scope
- Deterministic tool response contract
- Policy layering (kernel defaults + project overlay)
- Run lifecycle semantics
- Bundle identity semantics
- Violation taxonomy shape
- Bounded in-memory store guarantees

### 1.2 Out of Scope
- HTTP/SSE transport behavior
- Plugin registration model
- Network risk policy model
- External persistence backends

## 2. Core Concepts

### 2.1 Run
### 2.2 Bundle
### 2.3 Violation
### 2.4 Audit Event
### 2.5 Effective Policy
### 2.6 Contract Version

## 3. Response Contract

### 3.1 Top-level Response Shape
### 3.2 Canonical Meta Key Set
### 3.3 Code Alignment Rule (`meta.code == code`)
### 3.4 Timestamp Format (ISO8601 UTC `Z`)
### 3.5 Canonical Violation Shape

## 4. Policy Layering Semantics

### 4.1 Kernel Policy Source
### 4.2 Project Overlay Merge Rules
### 4.3 Strict Validation Rules
### 4.4 Profile Selection (`dev | ci | read_only`)

## 5. Behavioral Guarantees

### 5.1 Determinism Requirements
### 5.2 Owner Scoping Requirements
### 5.3 Run Lifecycle Requirements
### 5.4 Bundle Lifecycle Requirements
### 5.5 Bounded Store Requirements (TTL + max size)

## 6. Deterministic Bundle Hashing

### 6.1 Diff Normalization Rules
### 6.2 Canonical Payload Shape
### 6.3 JSON Serialization Rules
### 6.4 SHA-256 Computation Rules
### 6.5 Golden Test Cases

## 7. Compatibility and Versioning

### 7.1 Breaking vs Non-breaking Changes
### 7.2 Contract Version Bump Rules
### 7.3 Policy Schema Version Bump Rules

## 8. Non-Goals

### 8.1 No Implicit Active Run
### 8.2 No Unbounded State
### 8.3 No Silent Contract Drift
### 8.4 No Silent Policy Fallback

## 9. Conformance

### 9.1 Spec-test Inputs
### 9.2 Python Conformance Runner
### 9.3 Rust Conformance Runner
### 9.4 Cutover Gate Criteria
