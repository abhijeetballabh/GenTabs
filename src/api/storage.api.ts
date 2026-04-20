import type { Group } from '../types/group';

const STORAGE_KEY = 'gentabs_groups';
const CUSTOM_STORAGE_KEY = 'gentabs_custom_groups';

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
    const updatedGroups = [...existingGroups, newGroup]; // append
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedGroups });
    console.log('Group saved successfully.');
  } catch (error) {
    console.error('Failed to save group to storage:', error);
  }
};

export const updateGroup = async (updatedGroup: Group): Promise<void> => {
  try {
    const existingGroups = await getAllGroups();
    const updatedGroups = existingGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedGroups });
  } catch (error) {
    console.error('Failed to update group:', error);
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

export const getCustomGroups = async (): Promise<Group[]> => {
  try {
    const result = await chrome.storage.local.get(CUSTOM_STORAGE_KEY);
    return (result[CUSTOM_STORAGE_KEY] as Group[]) || [];
  } catch (error) {
    console.error('Failed to get custom groups:', error);
    return [];
  }
};

export const saveCustomGroup = async (newGroup: Group): Promise<void> => {
  try {
    const existing = await getCustomGroups();
    // prepend so newest appears first
    const updated = [newGroup, ...existing]; 
    await chrome.storage.local.set({ [CUSTOM_STORAGE_KEY]: updated });
  } catch (error) {
    console.error('Failed to save custom group:', error);
  }
};

export const updateCustomGroup = async (updatedGroup: Group): Promise<void> => {
  try {
    const existing = await getCustomGroups();
    const updated = existing.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    await chrome.storage.local.set({ [CUSTOM_STORAGE_KEY]: updated });
  } catch (error) {
    console.error('Failed to update custom group:', error);
  }
};

export const deleteCustomGroup = async (id: string): Promise<void> => {
  try {
    const existing = await getCustomGroups();
    const updated = existing.filter(g => g.id !== id);
    await chrome.storage.local.set({ [CUSTOM_STORAGE_KEY]: updated });
  } catch (error) {
    console.error(`Failed to delete custom group ${id}:`, error);
  }
};
