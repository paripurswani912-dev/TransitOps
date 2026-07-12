# Firestore Schema

This document outlines the collections and document structures for the TransitOps fleet operations platform.

## Collections

### 1. `users`
Represents the system users and their roles for Role-Based Access Control (RBAC).
* **Document ID**: `uid` (Firebase Auth UID)
* **Fields**:
  ```typescript
  {
    uid: string;
    name: string;
    email: string;
    role: 'FleetManager' | 'Dispatcher' | 'SafetyOfficer' | 'FinancialAnalyst';
    status: string; // e.g. 'Active', 'Suspended'
  }
  ```

### 2. `vehicles`
Stores information about the transport fleet.
* **Document ID**: `regNo` (Unique registration number, e.g. "NY-1234-AB")
* **Fields**:
  ```typescript
  {
    regNo: string; // unique identifier
    name: string;
    model: string;
    type: string; // e.g., 'Box Truck', 'Flatbed', 'Van'
    capacity: number; // in kg
    odometer: number; // in km/miles
    acqCost: number; // acquisition cost
    status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
  }
  ```

### 3. `drivers`
Information about active and off-duty drivers.
* **Document ID**: Auto-generated or custom ID
* **Fields**:
  ```typescript
  {
    name: string;
    licenseNo: string;
    licenseCategory: string; // e.g., 'Class A CDL'
    licenseExpiry: string; // ISO date string (YYYY-MM-DD)
    contact: string;
    safetyScore: number; // e.g., scale of 0 to 100
    status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
  }
  ```

### 4. `trips`
Tracks dispatch schedules and trip logs.
* **Document ID**: Auto-generated ID
* **Fields**:
  ```typescript
  {
    source: string;
    destination: string;
    vehicleId: string; // Reference to vehicles.regNo
    driverId: string; // Reference to drivers ID
    cargoWeight: number; // in kg
    plannedDistance: number;
    status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
    createdAt: string; // ISO date string or Firestore Timestamp
  }
  ```

### 5. `maintenance`
Details of vehicle service and repair operations.
* **Document ID**: Auto-generated ID
* **Fields**:
  ```typescript
  {
    vehicleId: string; // Reference to vehicles.regNo
    serviceType: string; // e.g., 'Oil Change', 'Brake Repair'
    cost: number;
    date: string; // ISO date string (YYYY-MM-DD)
    status: 'In Shop' | 'Completed';
  }
  ```

### 6. `fuelLogs`
Logs of refueling events for cost tracking.
* **Document ID**: Auto-generated ID
* **Fields**:
  ```typescript
  {
    vehicleId: string; // Reference to vehicles.regNo
    liters: number;
    cost: number;
    date: string; // ISO date string (YYYY-MM-DD)
  }
  ```

### 7. `expenses`
General and trip-related expenses like tolls and other operational costs.
* **Document ID**: Auto-generated ID
* **Fields**:
  ```typescript
  {
    tripId: string; // Reference to trips ID
    vehicleId: string; // Reference to vehicles.regNo
    toll: number;
    other: number;
    date: string; // ISO date string (YYYY-MM-DD)
  }
  ```
