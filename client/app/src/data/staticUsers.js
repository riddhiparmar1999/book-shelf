export const ROLE_OPTIONS = ["Admin", "Librarian", "Member", "Viewer"];

export const STATIC_USERS = [
  {
    id: 1,
    firstName: "Alex",
    lastName: "Rivera",
    email: "alex.rivera@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Admin",
  },
  {
    id: 2,
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Librarian",
  },
  {
    id: 3,
    firstName: "Sam",
    lastName: "Patel",
    email: "sam.patel@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Member",
  },
  {
    id: 4,
    firstName: "Taylor",
    lastName: "Nguyen",
    email: "taylor.nguyen@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Viewer",
  },
  {
    id: 5,
    firstName: "Riddhi",
    lastName: "User One",
    email: "riddhi@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Admin",
  },
  {
    id: 6,
    firstName: "Morgan",
    lastName: "Chen",
    email: "morgan.chen@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Librarian",
  },
  {
    id: 7,
    firstName: "Casey",
    lastName: "Brooks",
    email: "casey.brooks@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Member",
  },
  {
    id: 8,
    firstName: "Jamie",
    lastName: "Wright",
    email: "jamie.wright@example.com",
    password: "••••••••",
    confirmPassword: "••••••••",
    roleName: "Viewer",
  },
];

export function getStaticUserById(id) {
  return STATIC_USERS.find((user) => String(user.id) === String(id)) ?? null;
}
