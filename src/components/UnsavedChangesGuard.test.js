import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Link } from "react-router-dom";
import UnsavedChangesGuard from "./UnsavedChangesGuard";

test("cancel keeps the form and confirm permits SPA navigation", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  const router = createMemoryRouter([
    {path:"/", element:<><UnsavedChangesGuard when /><input aria-label="draft" defaultValue="saved in memory" /><Link to="/next">Next</Link></>},
    {path:"/next", element:<h1>Destination</h1>}
  ]);
  try {
    render(<RouterProvider router={router}/>);
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("draft")).toHaveValue("saved in memory");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText("Next"));
    expect(await screen.findByText("Destination")).toBeInTheDocument();
  } finally { router.dispose(); confirm.mockRestore(); }
});
