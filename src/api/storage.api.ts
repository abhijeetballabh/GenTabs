import type { Group } from '../types/group';

const STORAGE_KEY = 'gentabs_groups';

export const getAllGroups = async (): Promise<Group[]> => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as Group[]) || [];
  } catch (error) {
    console.error('Failed to get all groups from storage:', error);
    return [];
  }
};

export const saveGroup = async (newGroup: Group): Promise<void> => {
  try {
    const existingGroups = await getAllGroups();
    const updatedGroups = [...existingGroups, newGroup]; // append to existing groups
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedGroups });
    console.log('Group saved successfully.');
  } catch (error) {
    console.error('Failed to save group to storage:', error);
  }
};

export const deleteGroup = async (id: string): Promise<void> => {
  try {
    const existingGroups = await getAllGroups();
    const updatedGroups = existingGroups.filter(group => group.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedGroups });
  } catch (error) {
    console.error(`Failed to delete group with id ${id}:`, error);
  }
};

export const clearAllGroups = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear all groups:', error);
  }
};
