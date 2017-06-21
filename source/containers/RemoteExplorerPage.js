import { connect } from "react-redux";
import RemoteExplorer from "../components/RemoteExplorerPage.js";
import {
    getCurrentItems,
    getCurrentPath,
    getNewArchiveDetails,
    isCreatingFile,
    isLoading,
    shouldShowNewFilePrompt,
    shouldShowNewNamePrompt,
    shouldShowPasswordPrompt
} from "../selectors/RemoteExplorerPage.js";
import { getRemoteConnectionInfo } from "../selectors/RemoteConnectPage.js";
import {
    cancelNewPrompt,
    onChangeDirectory,
    onReceiveItems,
    selectArchive,
    setLoading,
    setNewArchiveName,
    setNewFilename,
    setNewMasterPassword,
    showNewMasterPasswordPrompt
} from "../actions/RemoteExplorerPage.js";
import { createNewArchive, getDirectoryContents } from "../shared/explorerConnection.js";
import {
    addArchiveToArchiveManager,
    createArchiveCredentials,
    createRemoteCredentials
} from "../library/buttercup.js";

function addToArchiveManager(state) {
    const {
        archiveName,
        archivePath,
        archivePassword,
        archiveType,
        remoteUsername,
        remotePassword,
        remoteURL
    } = { ...getNewArchiveDetails(state), ...getRemoteConnectionInfo(state) };
    const sourceCredentials = createRemoteCredentials(archiveType, {
        username: remoteUsername,
        password: remotePassword,
        url: remoteURL,
        path: archivePath
    });
    const archiveCredentials = createArchiveCredentials(archivePassword);
    return addArchiveToArchiveManager(archiveName, sourceCredentials, archiveCredentials);
}

function handleNewArchiveName(name, dispatch, getState) {
    dispatch(setNewArchiveName(name));
    // call to add with new state
    addToArchiveManager({
        ...getState(),
        archiveName: name
    });
}

function handleNewFile(filename, dispatch, getState) {
    dispatch(setNewFilename(filename));
    dispatch(showNewMasterPasswordPrompt());
}

function handleNewMasterPassword(password, dispatch, getState) {
    dispatch(setNewMasterPassword(password));
    createNewArchive(getState(), dispatch);
}

function handlePathSelection(nextItem, isDir, resetScroll, dispatch, getState) {
    const currentPath = getCurrentPath(getState());
    const nextPath = nextItem === ".." ?
        removeLastPathItem(currentPath) :
        nextItem;
    if (isDir) {
        // directory
        dispatch(setLoading(true));
        return getDirectoryContents(nextPath)
            .then(contents => dispatch(onReceiveItems(contents)))
            .then(function __afterContentsLoaded() {
                resetScroll();
                dispatch(onChangeDirectory(nextPath));
                dispatch(setLoading(false));
            });
    }
    // file
    // needs password first
    // dispatch(selectArchive(nextItem));
}

function removeLastPathItem(pathStr) {
    const parts = pathStr.split("/");
    const newPath = parts.slice(0, parts.length - 1).join("/").trim();
    return newPath.length > 0 ?
        newPath :
        "/";
}

export default connect(
    (state, ownProps) => ({
        creatingFile:                   isCreatingFile(state),
        items:                          getCurrentItems(state),
        loading:                        isLoading(state),
        remoteDirectory:                getCurrentPath(state),
        showNewName:                    shouldShowNewNamePrompt(state),
        showNewPassword:                shouldShowPasswordPrompt(state),
        showNewPrompt:                  shouldShowNewFilePrompt(state)
    }),
    {
        cancelNewPrompt,
        onNewArchiveName:               (name) => (dispatch, getState) =>
                                            handleNewArchiveName(name, dispatch, getState),
        onNewFilename:                  (filename) => (dispatch, getState) =>
                                            handleNewFile(filename, dispatch, getState),
        onNewMasterPassword:            (password) => (dispatch, getState) =>
                                            handleNewMasterPassword(password, dispatch, getState),
        onPathSelected:                 (remoteItem, isDir, scrollResetCB) => (dispatch, getState) =>
                                            handlePathSelection(remoteItem, isDir, scrollResetCB, dispatch, getState)
    }
)(RemoteExplorer);