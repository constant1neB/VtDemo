import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AddCar from "./AddCar";
import { getCars, deleteCar } from "../api/carapi";
import {
  DataGrid,
  GridColDef,
  GridCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Snackbar } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import EditCar from "./EditCar";

type CarlistProps = {
  logOut?: () => void;
};

function Carlist({ logOut }: CarlistProps) {
  const [open, setOpen] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data, error, isSuccess } = useQuery({
    queryKey: ["cars"],
    queryFn: getCars,
  });

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

  const handleOpenLogoutDialog = () => {
    setOpenLogoutDialog(true);
  };

  const handleCloseLogoutDialog = () => {
    setOpenLogoutDialog(false);
  };

  const handleConfirmLogout = () => {
    if (logOut) {
      logOut();
    }
    handleCloseLogoutDialog();
  };

  const columns: GridColDef[] = [
    { field: "brand", headerName: "Brand", width: 200 },
    { field: "model", headerName: "Model", width: 200 },
    { field: "color", headerName: "Color", width: 200 },
    { field: "registrationNumber", headerName: "Registration #", width: 150 },
    { field: "modelYear", headerName: "Model Year", width: 150 },
    { field: "price", headerName: "Price", width: 150 },
    {
      field: "edit",
      headerName: "Edit",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridCellParams) => <EditCar cardata={params.row} />,
    },
    {
      field: "delete",
      headerName: "Delete",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridCellParams) => {
        return (
          <IconButton
            aria-label="delete"
            size="small"
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
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      },
    },
  ];

  if (!isSuccess) {
    return <span>Loading...</span>;
  } else if (error) {
    return <span>Error when fetching cars...</span>;
  } else {
    return (
      <>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <AddCar />
          <Button onClick={handleOpenLogoutDialog}>Log out</Button>
        </Stack>
        <DataGrid
          rows={data}
          columns={columns}
          disableRowSelectionOnClick={true}
          getRowId={(row) => row._links.self.href}
          slots={{ toolbar: GridToolbar }}
        />
        <Snackbar
          open={open}
          autoHideDuration={2500}
          onClose={() => setOpen(false)}
          message="Row deleted"
        />
        <Dialog
          open={openLogoutDialog}
          onClose={handleCloseLogoutDialog}
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-description"
        >
          <DialogTitle id="logout-dialog-title">Confirm Logout</DialogTitle>
          <DialogContent>
            <DialogContentText id="logout-dialog-description">
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLogoutDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmLogout} color="primary" autoFocus>
              Log Out
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default Carlist;
