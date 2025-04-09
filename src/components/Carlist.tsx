import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCars, deleteCar } from "../api/carapi";
import { DataGrid, GridColDef, GridCellParams } from "@mui/x-data-grid";
import { Snackbar } from "@mui/material";

function Carlist() {
  const columns: GridColDef[] = [
    { field: "brand", headerName: "Brand", width: 200 },
    { field: "model", headerName: "Model", width: 200 },
    { field: "color", headerName: "Color", width: 200 },
    { field: "registrationNumber", headerName: "Registration #", width: 200 },
    { field: "modelYear", headerName: "Model Year", width: 200 },
    { field: "price", headerName: "Price", width: 200 },
    {
      field: "delete",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridCellParams) => {
        return (
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${params.row.brand} ${params.row.model}?`
                )
              ) {
                mutate(params.row._links.car.href);
              }
            }}
          >
            Delete
          </button>
        );
      },
    },
  ];
  const { data, error, isSuccess } = useQuery({
    queryKey: ["cars"],
    queryFn: getCars,
  });

  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      setOpen(true);
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
    onError: (err: unknown) => {
      console.error("Error deleting row: ", err);
    },
  });

  const [open, setOpen] = useState(false);

  if (!isSuccess) {
    return <span>Loading...</span>;
  } else if (error) {
    return <span>Error when fetching cars...</span>;
  } else {
    return (
      <>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row._links.self.href}
        />
        <Snackbar
          open={open}
          autoHideDuration={2000}
          onClose={() => setOpen(false)}
          message="Row deleted"
        />
      </>
    );
  }
}

export default Carlist;
