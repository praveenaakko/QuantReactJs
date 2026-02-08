
import React, { useState, useMemo } from 'react';
import { Pagination } from './Pagination';
import { useStore } from '../store/store';
import { UserRole, UserStatus, NotificationType } from '../types';
import api from '../config/api';
import { ConfirmationModal } from './ConfirmationModal';

export const UserManagementSection: React.FC = () => {
  const { state, dispatch } = useStore();
  const { users, currentUser } = state;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, 3000);
  };
  
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = useMemo(() =>
    users.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [users, currentPage, itemsPerPage]
  );
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleVerifyUser = async (userId: string) => {
      setProcessingId(userId);
      try {
          await api.put(`/users/${userId}/verify`, {});
          dispatch({ type: 'VERIFY_USER', payload: userId });
          addNotification('User verified successfully.', NotificationType.SUCCESS);
      } catch (error) {
          addNotification('Failed to verify user.', NotificationType.ERROR);
      } finally {
          setProcessingId(null);
      }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
      setProcessingId(userId);
      try {
          await api.put(`/users/${userId}/role`, { role: newRole });
          dispatch({ type: 'CHANGE_USER_ROLE', payload: { userId, role: newRole } });
          addNotification(`User role updated to ${newRole}.`, NotificationType.SUCCESS);
      } catch (error) {
          addNotification('Failed to update user role.', NotificationType.ERROR);
      } finally {
          setProcessingId(null);
      }
  };

  const initiateDeleteUser = (userId: string, userName: string) => {
      setUserToDelete({ id: userId, name: userName });
      setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
      if (!userToDelete) return;
      
      setProcessingId(userToDelete.id);
      try {
          await api.delete(`/users/${userToDelete.id}`);
          dispatch({ type: 'DELETE_USER', payload: userToDelete.id });
          addNotification(`User "${userToDelete.name}" deleted successfully.`, NotificationType.SUCCESS);
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
      } catch (error) {
          addNotification('Failed to delete user.', NotificationType.ERROR);
      } finally {
          setProcessingId(null);
      }
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10 backdrop-blur-sm mt-16">
        <h2 className="text-3xl font-argent mb-6">User Directory & Management</h2>
        <div className="overflow-x-auto max-h-[450px] relative border border-white/10 rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-800 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 font-greycliff w-1/3">User</th>
                        <th className="p-3 font-greycliff text-center">Role</th>
                        <th className="p-3 font-greycliff text-center">Status</th>
                        <th className="p-3 font-greycliff text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedUsers.length > 0 ? (
                        paginatedUsers.map(user => {
                            const hasPhoto = user.photoUrl && !user.photoUrl.includes('null') && !user.photoUrl.includes('undefined') && user.photoUrl !== '/';
                            return (
                                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                                                {hasPhoto ? (
                                                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <i className="ri-user-line text-white/50"></i>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-greycliff text-white font-medium">{user.name}</div>
                                                <div className="font-greycliff text-white/50 text-xs">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${user.role === UserRole.ADMIN ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                         <span className={`px-2 py-1 rounded-full text-xs flex items-center justify-center gap-1 mx-auto w-fit ${user.status === UserStatus.VERIFIED ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                                            <i className={`ri-${user.status === UserStatus.VERIFIED ? 'checkbox-circle-line' : 'time-line'}`}></i>
                                            {user.status === UserStatus.VERIFIED ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {user.status === UserStatus.PENDING && (
                                                <button 
                                                    onClick={() => handleVerifyUser(user.id)} 
                                                    disabled={processingId === user.id}
                                                    className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50" 
                                                    title="Verify User"
                                                >
                                                    <i className="ri-check-line"></i>
                                                </button>
                                            )}
                                            
                                            {user.id !== currentUser?.id && (
                                                <>
                                                    <button 
                                                        onClick={() => handleChangeRole(user.id, user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN)} 
                                                        disabled={processingId === user.id}
                                                        className={`p-1.5 rounded transition disabled:opacity-50 ${user.role === UserRole.ADMIN ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'}`}
                                                        title={user.role === UserRole.ADMIN ? "Demote to User" : "Promote to Admin"}
                                                    >
                                                        <i className={`ri-${user.role === UserRole.ADMIN ? 'user-line' : 'shield-user-line'}`}></i>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => initiateDeleteUser(user.id, user.name)} 
                                                        disabled={processingId === user.id}
                                                        className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50" 
                                                        title="Delete User"
                                                    >
                                                        {processingId === user.id ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-delete-bin-line"></i>}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={4} className="p-6 text-center font-greycliff text-white/50">
                                No users found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        {users.length > itemsPerPage && (
             <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                totalItems={users.length}
            />
        )}
        
        <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDeleteUser}
            title="Delete User"
            message={
                <p>
                    Are you sure you want to delete user <strong>{userToDelete?.name}</strong>? 
                    This action cannot be undone and will remove their access permanently.
                </p>
            }
            confirmText="Delete User"
            isConfirming={!!(userToDelete && processingId === userToDelete.id)}
        />
    </div>
  );
};